#!/usr/bin/env node
import { randomUUID } from "node:crypto";
import { pathToFileURL } from "node:url";
import postgres from "postgres";

const SOURCE_TENANT_ID = "77777777-7777-4777-8777-777777777777";
const SOURCE_STORE_ID = "66666666-6666-4666-8666-666666666666";
const DEFAULT_SOURCE_DATABASE_URL =
  "postgresql://lojaveiculosv2:lojaveiculosv2_dev@localhost:54321/lojaveiculosv2";

const EXCLUDED_TABLES = new Set([
  "addons",
  "billing_addon_contracts",
  "billing_catalog_versions",
  "billing_customers",
  "billing_provider_reconciliations",
  "identity_invitations",
  "membership_permission_overrides",
  "payments",
  "plan_features",
  "plans",
  "role_template_permissions",
  "role_templates",
  "store_entitlement_events",
  "store_entitlements",
  "store_memberships",
  "subscription_items",
  "subscriptions",
  "tenant_memberships",
  "tenants",
  "users",
  "stores",
]);

const DEFAULT_USER_ID = null;

export function parseSeedArgs(argv) {
  const userId = readOption(argv, "user-id") ?? DEFAULT_USER_ID;
  const storeId = readOption(argv, "store-id");
  const source = readOption(argv, "source");
  if (!userId || !storeId) {
    throw new Error(
      "Usage: pnpm staging:seed-store -- --user-id=<userId> --store-id=<storeId> [--apply]",
    );
  }
  return { apply: argv.includes("--apply"), source, storeId, userId };
}

export function remapSeedValue(value, mapping) {
  if (value instanceof Date) return value;
  if (Buffer.isBuffer(value)) return value;
  if (Array.isArray(value))
    return value.map((item) => remapSeedValue(item, mapping));
  if (value && typeof value === "object")
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [
        key,
        remapSeedValue(item, mapping),
      ]),
    );
  if (typeof value !== "string") return value;

  let result = value;
  for (const [from, to] of mapping.stringReplacements)
    result = result.replaceAll(from, to);
  return result;
}

export function orderSeedTables(tableNames, foreignKeys) {
  const names = new Set(tableNames);
  const dependencies = new Map(tableNames.map((name) => [name, new Set()]));
  for (const foreignKey of foreignKeys) {
    if (
      names.has(foreignKey.tableName) &&
      names.has(foreignKey.referencedTableName) &&
      foreignKey.tableName !== foreignKey.referencedTableName
    ) {
      dependencies
        .get(foreignKey.tableName)
        .add(foreignKey.referencedTableName);
    }
  }

  const ordered = [];
  const remaining = new Set(tableNames);
  while (remaining.size) {
    const ready = [...remaining]
      .filter((name) =>
        [...dependencies.get(name)].every(
          (dependency) => !remaining.has(dependency),
        ),
      )
      .sort();
    if (!ready.length) {
      ordered.push(...[...remaining].sort());
      break;
    }
    ordered.push(...ready);
    for (const name of ready) remaining.delete(name);
  }
  return ordered;
}

export async function runSeed(input, env = process.env) {
  const targetUrl =
    (env.APP_ENV === "staging" ? env.STAGING_DB : undefined) ??
    env.DATABASE_URL;
  const auditUrl =
    (env.APP_ENV === "staging" ? env.STAGING_AUDIT_DB : undefined) ??
    env.AUDIT_DATABASE_URL;
  const sourceUrl =
    input.source ?? env.SEED_SOURCE_DATABASE_URL ?? DEFAULT_SOURCE_DATABASE_URL;

  if (!targetUrl)
    throw new Error("DATABASE_URL or STAGING_DB must be configured.");
  if (input.apply && env.APP_ENV !== "staging")
    throw new Error(
      "Applying the scoped fixture seed is restricted to APP_ENV=staging.",
    );
  if (input.apply && !auditUrl)
    throw new Error(
      "AUDIT_DATABASE_URL or STAGING_AUDIT_DB is required for an applied seed.",
    );
  assertLocalSource(sourceUrl);

  const source = postgres(sourceUrl, connectionOptions(sourceUrl));
  const target = postgres(targetUrl, connectionOptions(targetUrl));
  const audit = input.apply
    ? postgres(auditUrl, connectionOptions(auditUrl))
    : null;
  try {
    const targetUser = await resolveTargetUser(target, input.userId);
    const targetStore = await resolveTargetStore(
      target,
      input.storeId,
      targetUser.id,
    );
    const sourceScope = await resolveSourceScope(source);
    const sourceUsers = await source`
      SELECT id, clerk_user_id
      FROM users
      WHERE tenant_id=${sourceScope.tenantId}
         OR clerk_user_id='clerk_platform_admin'
    `;
    const sourceAssetUrls = await resolveSourceAssetUrls(source, sourceScope);
    const mapping = createMapping({
      sourceAssetUrls,
      sourceScope,
      sourceUsers,
      targetStore,
      targetUser,
    });
    const metadata = await resolveScopedTableMetadata(source, target);
    const plans = await buildSeedPlans(source, metadata, mapping);
    const preview = summarizePlans(plans, {
      sourceStoreId: sourceScope.storeId,
      targetStoreId: targetStore.id,
      targetTenantId: targetStore.tenant_id,
      userId: targetUser.id,
    });
    if (!input.apply) return { applied: false, ...preview };

    const requestId = `staging-store-seed-${randomUUID()}`;
    await target.begin(async (tx) => {
      await tx`SELECT pg_advisory_xact_lock(
        hashtextextended('lojaveiculosv2:staging:seed-existing-store', 0)
      )`;
      await assertNoConflictingRows(tx, plans);
      for (const plan of plans) await insertSeedPlan(tx, plan);
      await persistSeedAudit(audit, {
        counts: preview.counts,
        requestId,
        store: targetStore,
        user: targetUser,
      });
    });
    return { applied: true, requestId, ...preview };
  } finally {
    await source.end();
    await target.end();
    await audit?.end();
  }
}

function readOption(argv, name) {
  return argv
    .find((value) => value.startsWith(`--${name}=`))
    ?.slice(name.length + 3)
    .trim();
}

function assertLocalSource(value) {
  const url = new URL(value);
  if (!["localhost", "127.0.0.1", "::1"].includes(url.hostname))
    throw new Error("SEED_SOURCE_DATABASE_URL must point to local Postgres.");
}

async function resolveTargetUser(sql, userId) {
  const rows = await sql`SELECT id, clerk_user_id
    FROM users
    WHERE id::text=${userId} OR clerk_user_id=${userId}
    ORDER BY CASE WHEN id::text=${userId} THEN 0 ELSE 1 END
    LIMIT 2`;
  if (!rows.length) throw new Error(`Target V2 user was not found: ${userId}`);
  if (rows.length > 1)
    throw new Error(`Target V2 user id is ambiguous: ${userId}`);
  return rows[0];
}

async function resolveTargetStore(sql, storeId, userId) {
  const [store] = await sql`SELECT store.id, store.public_slug, store.tenant_id,
      tenant.slug AS tenant_slug
    FROM stores AS store
    INNER JOIN tenants AS tenant ON tenant.id=store.tenant_id
    WHERE store.id=${storeId} AND store.is_deleted=false
    LIMIT 1`;
  if (!store) throw new Error(`Target staging store was not found: ${storeId}`);
  const [access] = await sql`SELECT 1
    FROM store_memberships
    WHERE user_id=${userId} AND store_id=${store.id} AND status='active'
    UNION ALL
    SELECT 1
    FROM tenant_memberships
    WHERE user_id=${userId} AND tenant_id=${store.tenant_id} AND status='active'
    LIMIT 1`;
  if (!access)
    throw new Error(
      "Target user does not have active access to the target store.",
    );
  return store;
}

async function resolveSourceScope(sql) {
  const [store] = await sql`SELECT id, public_slug, tenant_id
    FROM stores
    WHERE id=${SOURCE_STORE_ID} AND is_deleted=false
    LIMIT 1`;
  if (!store || store.tenant_id !== SOURCE_TENANT_ID)
    throw new Error(
      "The local fixture source is missing its canonical primary store.",
    );
  const [tenant] = await sql`SELECT slug
    FROM tenants
    WHERE id=${SOURCE_TENANT_ID} AND is_deleted=false
    LIMIT 1`;
  if (!tenant)
    throw new Error(
      "The local fixture source is missing its canonical tenant.",
    );
  return {
    storeId: store.id,
    storeSlug: store.public_slug,
    tenantId: store.tenant_id,
    tenantSlug: tenant.slug,
  };
}

async function resolveSourceAssetUrls(sql, scope) {
  const rows = await sql`SELECT url, metadata
    FROM vehicle_media
    WHERE tenant_id=${scope.tenantId} AND store_id=${scope.storeId}`;
  return rows
    .map((row) => [row.url, row.metadata?.sourceUrl])
    .filter((pair) => pair[0] && pair[1]);
}

function createMapping(input) {
  const stringReplacements = [
    [input.sourceScope.tenantId, input.targetStore.tenant_id],
    [input.sourceScope.storeId, input.targetStore.id],
    [
      input.sourceScope.tenantSlug,
      input.targetStore.tenant_slug ?? input.sourceScope.tenantSlug,
    ],
    [input.sourceScope.storeSlug, input.targetStore.public_slug],
    ...input.sourceAssetUrls,
  ];
  for (const sourceUser of input.sourceUsers) {
    stringReplacements.push([sourceUser.id, input.targetUser.id]);
    if (sourceUser.clerk_user_id)
      stringReplacements.push([
        sourceUser.clerk_user_id,
        input.targetUser.clerk_user_id,
      ]);
  }
  return { stringReplacements };
}

async function resolveScopedTableMetadata(source, target) {
  const [sourceTables, targetTables, foreignKeys] = await Promise.all([
    listTableMetadata(source),
    listTableMetadata(target),
    listForeignKeys(source),
  ]);
  const targetNames = new Set(targetTables.keys());
  const tables = new Map();
  for (const [name, sourceMeta] of sourceTables) {
    const targetMeta = targetTables.get(name);
    if (!targetMeta || EXCLUDED_TABLES.has(name)) continue;
    if (!sourceMeta.hasTenant && !sourceMeta.hasStore) continue;
    const targetColumns = new Set(targetMeta.columns);
    const columns = sourceMeta.columns.filter((column) =>
      targetColumns.has(column),
    );
    const missingRequired = targetMeta.requiredColumns.filter(
      (column) => !columns.includes(column),
    );
    tables.set(name, { ...sourceMeta, columns, missingRequired });
  }
  return { foreignKeys, tables };
}

async function listTableMetadata(sql) {
  const rows = await sql`
    SELECT table_name,
      bool_or(column_name='tenant_id') AS has_tenant,
      bool_or(column_name='store_id') AS has_store,
      array_agg(column_name ORDER BY ordinal_position) AS columns,
      array_agg(column_name ORDER BY ordinal_position)
        FILTER (WHERE is_nullable='NO' AND column_default IS NULL AND is_generated='NEVER') AS required_columns
    FROM information_schema.columns
    WHERE table_schema='public'
    GROUP BY table_name
  `;
  return new Map(
    rows.map((row) => [
      row.table_name,
      {
        columns: row.columns,
        hasStore: row.has_store,
        hasTenant: row.has_tenant,
        requiredColumns: row.required_columns ?? [],
      },
    ]),
  );
}

async function listForeignKeys(sql) {
  return sql`
    SELECT child.relname AS table_name, parent.relname AS referenced_table_name
    FROM pg_constraint AS constraint_row
    INNER JOIN pg_class AS child ON child.oid=constraint_row.conrelid
    INNER JOIN pg_namespace AS child_schema ON child_schema.oid=child.relnamespace
    INNER JOIN pg_class AS parent ON parent.oid=constraint_row.confrelid
    INNER JOIN pg_namespace AS parent_schema ON parent_schema.oid=parent.relnamespace
    WHERE constraint_row.contype='f'
      AND child_schema.nspname='public'
      AND parent_schema.nspname='public'
  `.then((rows) =>
    rows.map((row) => ({
      referencedTableName: row.referenced_table_name,
      tableName: row.table_name,
    })),
  );
}

async function buildSeedPlans(source, metadata, mapping) {
  const plans = [];
  for (const [tableName, tableMeta] of metadata.tables) {
    const rows = await selectScopedRows(source, tableName, tableMeta);
    if (!rows.length) continue;
    if (tableMeta.missingRequired.length)
      throw new Error(
        `Target table ${tableName} is missing source columns: ${tableMeta.missingRequired.join(", ")}`,
      );
    plans.push({
      columns: tableMeta.columns,
      rows: rows.map((row) => remapRow(row, mapping)),
      tableName,
    });
  }
  const order = orderSeedTables(
    plans.map((plan) => plan.tableName),
    metadata.foreignKeys,
  );
  const byName = new Map(plans.map((plan) => [plan.tableName, plan]));
  return order.map((tableName) => byName.get(tableName)).filter(Boolean);
}

async function selectScopedRows(sql, tableName, tableMeta) {
  const table = sql(tableName);
  if (tableMeta.hasTenant && tableMeta.hasStore)
    return sql`SELECT * FROM ${table}
      WHERE tenant_id=${SOURCE_TENANT_ID} AND store_id=${SOURCE_STORE_ID}`;
  if (tableMeta.hasTenant)
    return sql`SELECT * FROM ${table} WHERE tenant_id=${SOURCE_TENANT_ID}`;
  return sql`SELECT * FROM ${table} WHERE store_id=${SOURCE_STORE_ID}`;
}

function remapRow(row, mapping) {
  return Object.fromEntries(
    Object.entries(row).map(([column, value]) => [
      column,
      remapSeedValue(value, mapping),
    ]),
  );
}

function summarizePlans(plans, scope) {
  const counts = Object.fromEntries(
    plans.map((plan) => [plan.tableName, plan.rows.length]),
  );
  return {
    counts,
    sourceStoreId: scope.sourceStoreId,
    tableCount: plans.length,
    targetStoreId: scope.targetStoreId,
    targetTenantId: scope.targetTenantId,
    totalRows: plans.reduce((total, plan) => total + plan.rows.length, 0),
    userId: scope.userId,
  };
}

async function assertNoConflictingRows(tx, plans) {
  for (const plan of plans) {
    const ids = plan.rows.map((row) => row.id).filter(Boolean);
    if (!ids.length) continue;
    const existing = await tx`SELECT *
      FROM ${tx(plan.tableName)}
      WHERE id IN ${tx(ids)}`;
    const byId = new Map(existing.map((row) => [row.id, row]));
    for (const row of plan.rows) {
      const current = byId.get(row.id);
      if (current && canonicalValue(current) !== canonicalValue(row))
        throw new Error(
          `Existing staging row conflicts with fixture: ${plan.tableName}/${row.id}`,
        );
    }
  }
}

async function insertSeedPlan(tx, plan) {
  const values = plan.rows.map((row) =>
    Object.fromEntries(plan.columns.map((column) => [column, row[column]])),
  );
  if (!values.length) return;
  const missingValue = plan.rows
    .flatMap((row, rowIndex) =>
      plan.columns.map((column) => ({
        column,
        rowIndex,
        value: row[column],
      })),
    )
    .find(({ value }) => value === undefined);
  if (missingValue)
    throw new Error(
      `Fixture row has an undefined value: ${plan.tableName}/${plan.rows[missingValue.rowIndex].id} column ${missingValue.column}`,
    );
  await tx`INSERT INTO ${tx(plan.tableName)} ${tx(values, ...plan.columns)}
    ON CONFLICT (id) DO NOTHING`;
}

async function persistSeedAudit(sql, input) {
  await sql`INSERT INTO audit_events
    (action, actor_id, actor_kind, category, changes, criticality,
     data_classification, entity_id, entity_type, failure_tier, metadata,
     outcome, request_context, request_id, severity, source, store_id,
     summary, tags, target, tenant_id, created_at, updated_at)
    VALUES ('staging.store.fixture_seed', 'staging_operator', 'system',
      'data_change', ${sql.json([
        {
          after: { tableCount: Object.keys(input.counts).length },
          before: null,
          path: "scoped_fixture_rows",
        },
      ])}, 'high', 'internal', ${input.store.id}, 'store_fixture', 'required',
      ${sql.json({ counts: input.counts, targetUserId: input.user.id })},
      'succeeded', ${sql.json({ requestId: input.requestId })}, ${input.requestId},
      'info', ${sql.json({ component: "seed-existing-store", environment: "staging", service: "operator" })},
      ${input.store.id}, 'Seeded canonical product fixtures into an existing staging store.',
      ${sql.json(["staging", "operator_exception", "fixture_seed"])},
      ${sql.json({ id: input.store.id, type: "store" })}, ${input.store.tenant_id}, now(), now())`;
}

function canonicalValue(value) {
  return JSON.stringify(normalizeValue(value));
}

function normalizeValue(value) {
  if (value instanceof Date) return { date: value.toISOString() };
  if (Buffer.isBuffer(value)) return { buffer: value.toString("base64") };
  if (Array.isArray(value)) return value.map(normalizeValue);
  if (value && typeof value === "object")
    return Object.fromEntries(
      Object.entries(value)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, item]) => [key, normalizeValue(item)]),
    );
  return value;
}

function connectionOptions(value) {
  const hostname = new URL(value).hostname;
  const local = ["127.0.0.1", "localhost", "::1"].includes(hostname);
  return { max: 1, prepare: false, ssl: local ? false : "require" };
}

const isMain =
  process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
if (isMain) {
  try {
    const result = await runSeed(parseSeedArgs(process.argv.slice(2)));
    process.stdout.write(
      `${result.applied ? "Applied" : "Dry run"}: ${result.totalRows} rows across ${result.tableCount} scoped tables for store ${result.targetStoreId}${result.requestId ? ` (request ${result.requestId})` : ""}.\n`,
    );
    if (!result.applied)
      process.stdout.write(`${JSON.stringify(result.counts)}\n`);
  } catch (error) {
    process.stderr.write(
      `${error instanceof Error ? error.message : String(error)}\n`,
    );
    process.exitCode = 1;
  }
}
