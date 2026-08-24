#!/usr/bin/env node
import { randomUUID } from "node:crypto";
import { pathToFileURL } from "node:url";
import postgres from "postgres";

const DEFAULT_REASON = "Staging all-feature evaluation.";

export function parseGrantArgs(argv) {
  const positional = argv.find((value) => !value.startsWith("--"));
  const option = argv
    .find((value) => value.startsWith("--user-id="))
    ?.slice("--user-id=".length);
  const reason =
    argv
      .find((value) => value.startsWith("--reason="))
      ?.slice("--reason=".length)
      .trim() || DEFAULT_REASON;
  const userId = option?.trim() || positional?.trim();
  if (!userId)
    throw new Error(
      "Usage: pnpm billing:grant-all -- <userId> [--reason=...] [--apply]",
    );
  return { apply: argv.includes("--apply"), reason, userId };
}

export function oneCalendarMonthFrom(date) {
  const result = new Date(date);
  const day = result.getUTCDate();
  result.setUTCDate(1);
  result.setUTCMonth(result.getUTCMonth() + 1);
  const lastDay = new Date(
    Date.UTC(result.getUTCFullYear(), result.getUTCMonth() + 1, 0),
  ).getUTCDate();
  result.setUTCDate(Math.min(day, lastDay));
  return result;
}

export function planZapiOperatorOverride(contract) {
  if (!contract || contract.status === "cancelled") return "create";
  if (["active", "paid_awaiting_setup"].includes(contract.status))
    return "keep";
  return "activate";
}

export function resolveGrantDatabaseUrls(env = process.env) {
  const staging = env.APP_ENV === "staging";
  return {
    auditDatabaseUrl:
      (staging ? env.STAGING_AUDIT_DB : undefined) ?? env.AUDIT_DATABASE_URL,
    databaseUrl: (staging ? env.STAGING_DB : undefined) ?? env.DATABASE_URL,
  };
}

export async function runGrant(input, env = process.env) {
  const { auditDatabaseUrl, databaseUrl } = resolveGrantDatabaseUrls(env);
  if (!databaseUrl)
    throw new Error("DATABASE_URL or STAGING_DB must be configured.");
  if (input.apply && env.APP_ENV !== "staging")
    throw new Error(
      "Applying all-feature access is restricted to APP_ENV=staging.",
    );
  if (input.apply && !auditDatabaseUrl)
    throw new Error(
      "AUDIT_DATABASE_URL or STAGING_AUDIT_DB is required for an applied grant.",
    );

  const product = postgres(databaseUrl, connectionOptions(databaseUrl));
  const audit = input.apply
    ? postgres(auditDatabaseUrl, connectionOptions(auditDatabaseUrl))
    : null;
  try {
    const user = await resolveUser(product, input.userId);
    const stores = await resolveStores(product, user.id);
    const catalog = await resolveActiveCatalogFeatures(product);
    const features = catalog.features;
    const zapiAddon = await resolveActiveZapiAddon(product);
    const startsAt = new Date();
    const endsAt = oneCalendarMonthFrom(startsAt);
    const preview = {
      catalogVersion: catalog.version,
      endsAt: endsAt.toISOString(),
      features,
      featureCount: features.length,
      storeCount: stores.length,
      userId: user.id,
      zapiAddonAvailable: Boolean(zapiAddon),
    };
    if (!input.apply) return { applied: false, ...preview };

    const requestId = `staging-entitlement-grant-${randomUUID()}`;
    const zapiContracts = [];
    await product.begin(async (tx) => {
      await tx`SELECT pg_advisory_xact_lock(
        hashtextextended('lojaveiculosv2:staging:grant-all', 0)
      )`;
      for (const store of stores)
        await grantStoreFeatures(tx, {
          endsAt,
          features,
          reason: input.reason,
          requestId,
          startsAt,
          store,
          user,
        });
      if (zapiAddon)
        for (const store of stores)
          zapiContracts.push(
            await grantZapiOperatorOverride(tx, {
              addon: zapiAddon,
              store,
              startsAt,
            }),
          );
      await persistRequiredAudit(audit, {
        endsAt,
        features,
        reason: input.reason,
        requestId,
        stores,
        user,
        zapiContracts,
      });
    });
    return { applied: true, requestId, zapiContracts, ...preview };
  } finally {
    await product.end();
    await audit?.end();
  }
}

async function resolveUser(sql, userId) {
  const rows = await sql`SELECT id, clerk_user_id FROM users
    WHERE id::text=${userId} OR clerk_user_id=${userId}
    ORDER BY CASE WHEN id::text=${userId} THEN 0 ELSE 1 END
    LIMIT 2`;
  if (!rows.length) throw new Error(`V2 user was not found: ${userId}`);
  if (rows.length > 1) throw new Error(`V2 user id is ambiguous: ${userId}`);
  return rows[0];
}

async function resolveStores(sql, userId) {
  const rows = await sql`SELECT DISTINCT store.id, store.tenant_id
    FROM stores AS store
    WHERE store.id IN (
      SELECT membership.store_id
      FROM store_memberships AS membership
      WHERE membership.user_id=${userId} AND membership.status='active'
    )
    OR store.tenant_id IN (
      SELECT membership.tenant_id
      FROM tenant_memberships AS membership
      WHERE membership.user_id=${userId} AND membership.status='active'
    )
    ORDER BY store.id`;
  if (!rows.length)
    throw new Error("The V2 user has no active store or tenant membership.");
  return rows;
}

async function resolveActiveCatalogFeatures(sql) {
  const rows = await sql`WITH active_catalog AS (
      SELECT version
      FROM billing_catalog_versions
      WHERE status='active' AND published_at <= now()
      LIMIT 1
    ), catalog_features AS (
      SELECT feature.feature_key
      FROM plan_features AS feature
      INNER JOIN plans AS plan ON plan.id=feature.plan_id
      INNER JOIN active_catalog AS catalog
        ON catalog.version=plan.catalog_version
      WHERE plan.status='active' AND plan.published_at <= now()
        AND feature.included=1
      UNION
      SELECT addon.feature_key
      FROM addons AS addon
      INNER JOIN active_catalog AS catalog
        ON catalog.version=addon.catalog_version
      WHERE addon.status='active' AND addon.published_at <= now()
    )
    SELECT catalog.version AS catalog_version, feature.feature_key
    FROM active_catalog AS catalog
    CROSS JOIN catalog_features AS feature
    ORDER BY feature.feature_key`;
  if (!rows.length)
    throw new Error("The active billing catalog has no features.");
  return {
    features: rows.map((row) => row.feature_key),
    version: rows[0].catalog_version,
  };
}

async function resolveActiveZapiAddon(sql) {
  const [addon] = await sql`SELECT addon.id, addon.monthly_price_cents
    FROM addons AS addon
    INNER JOIN billing_catalog_versions AS catalog
      ON catalog.version=addon.catalog_version
    WHERE catalog.status='active' AND catalog.published_at <= now()
      AND addon.status='active' AND addon.published_at <= now()
      AND addon.code='crm_zapi'
    ORDER BY addon.published_at DESC
    LIMIT 1`;
  return addon ?? null;
}

async function grantStoreFeatures(tx, input) {
  for (const featureKey of input.features) {
    const [before] = await tx`SELECT ends_at, starts_at, status
      FROM store_entitlements
      WHERE store_id=${input.store.id} AND feature_key=${featureKey} LIMIT 1`;
    if (coversGrantWindow(before, input.startsAt, input.endsAt)) continue;
    const metadata = {
      grantedToUserId: input.user.id,
      reason: input.reason,
      requestId: input.requestId,
    };
    await tx`INSERT INTO store_entitlements
      (ends_at, feature_key, metadata, source, starts_at, status, store_id,
       tenant_id, created_at, updated_at)
      VALUES (${input.endsAt}, ${featureKey}, ${tx.json(metadata)},
        'operator_exception', ${input.startsAt}, 'active', ${input.store.id},
        ${input.store.tenant_id}, now(), now())
      ON CONFLICT (store_id, feature_key) DO UPDATE SET
        ends_at=GREATEST(
          COALESCE(store_entitlements.ends_at, excluded.ends_at),
          excluded.ends_at
        ),
        metadata=excluded.metadata,
        source=excluded.source,
        starts_at=COALESCE(
          LEAST(store_entitlements.starts_at, excluded.starts_at),
          store_entitlements.starts_at,
          excluded.starts_at
        ),
        status='active',
        updated_at=now()`;
    await tx`INSERT INTO store_entitlement_events
      (actor_id, feature_key, metadata, next_status, previous_status, reason,
       source, store_id, tenant_id, created_at, updated_at)
      VALUES (${input.user.clerk_user_id ?? input.user.id}, ${featureKey},
        ${tx.json({ requestId: input.requestId })}, 'active',
        ${before?.status ?? null}, ${input.reason}, 'operator_exception',
        ${input.store.id}, ${input.store.tenant_id}, now(), now())`;
  }
}

async function grantZapiOperatorOverride(tx, input) {
  const [existing] = await tx`SELECT
      id, activated_by_payment_id, activated_by_provider_checkout_id,
      activated_by_provider_event_id, paid_at, scheduled_for, status
    FROM billing_addon_contracts
    WHERE store_id=${input.store.id} AND tenant_id=${input.store.tenant_id}
      AND addon_id=${input.addon.id} AND status <> 'cancelled'
    ORDER BY created_at DESC
    LIMIT 1`;
  const action = planZapiOperatorOverride(existing);
  if (action === "keep")
    return toZapiContractSummary(existing, false, input.store.id);

  if (action === "activate") {
    const [updated] = await tx`UPDATE billing_addon_contracts
      SET paid_at=COALESCE(paid_at, ${input.startsAt}),
          scheduled_for=NULL,
          status='paid_awaiting_setup',
          updated_at=now()
      WHERE id=${existing.id} AND status IN ('pending', 'scheduled')
      RETURNING id, activated_by_payment_id, activated_by_provider_checkout_id,
        activated_by_provider_event_id, paid_at, scheduled_for, status`;
    if (updated) return toZapiContractSummary(updated, true, input.store.id);
    const [raced] = await tx`SELECT
        id, activated_by_payment_id, activated_by_provider_checkout_id,
        activated_by_provider_event_id, paid_at, scheduled_for, status
      FROM billing_addon_contracts
      WHERE id=${existing.id}
      LIMIT 1`;
    return toZapiContractSummary(raced ?? existing, false, input.store.id);
  }

  const [subscription] = await tx`SELECT id
    FROM subscriptions
    WHERE tenant_id=${input.store.tenant_id}
    ORDER BY created_at DESC
    LIMIT 1`;
  if (!subscription)
    throw new Error(
      `No subscription was found for staging store ${input.store.id}.`,
    );

  const [item] = await tx`INSERT INTO subscription_items
    (addon_id, item_type, quantity, starts_at, store_id, subscription_id,
     tenant_id, unit_amount_cents, created_at, updated_at)
    VALUES (${input.addon.id}, 'addon', 1, ${input.startsAt}, ${input.store.id},
      ${subscription.id}, ${input.store.tenant_id}, ${input.addon.monthly_price_cents},
      now(), now())
    RETURNING id`;
  if (!item) throw new Error("Z-API subscription item was not persisted.");

  const [contract] = await tx`INSERT INTO billing_addon_contracts
    (addon_id, paid_at, scheduled_for, status, store_id, subscription_id,
     subscription_item_id, tenant_id, created_at, updated_at)
    VALUES (${input.addon.id}, ${input.startsAt}, NULL, 'paid_awaiting_setup',
      ${input.store.id}, ${subscription.id}, ${item.id}, ${input.store.tenant_id},
      now(), now())
    RETURNING id, activated_by_payment_id, activated_by_provider_checkout_id,
      activated_by_provider_event_id, paid_at, scheduled_for, status`;
  if (!contract) throw new Error("Z-API billing contract was not persisted.");
  return toZapiContractSummary(contract, true, input.store.id);
}

function toZapiContractSummary(contract, changed, storeId) {
  return {
    changed,
    contractId: contract.id,
    providerEvidenceAbsent:
      !contract.activated_by_payment_id &&
      !contract.activated_by_provider_checkout_id &&
      !contract.activated_by_provider_event_id,
    status: contract.status,
    storeId,
  };
}

function coversGrantWindow(entitlement, startsAt, endsAt) {
  if (!entitlement) return false;
  if (!["active", "trialing"].includes(entitlement.status)) return false;
  if (entitlement.starts_at && entitlement.starts_at > startsAt) return false;
  return !entitlement.ends_at || entitlement.ends_at >= endsAt;
}

async function persistRequiredAudit(sql, input) {
  for (const store of input.stores)
    await sql`INSERT INTO audit_events
      (action, actor_id, actor_kind, category, changes, criticality,
       data_classification, entity_id, entity_type, failure_tier, metadata,
       outcome, request_context, request_id, severity, source, store_id,
       summary, tags, target, tenant_id, created_at, updated_at)
      VALUES ('billing.entitlements.operator_grant_all',
        ${input.user.clerk_user_id ?? input.user.id}, 'user', 'authorization',
        ${sql.json([
          {
            after: { endsAt: input.endsAt.toISOString(), status: "active" },
            before: null,
            path: "store_entitlements",
          },
        ])},
        'critical', 'internal', ${store.id}, 'store_entitlements', 'required',
        ${sql.json({
          featureCount: input.features.length,
          reason: input.reason,
          targetUserId: input.user.id,
        })},
        'attempted', ${sql.json({ requestId: input.requestId })}, ${input.requestId},
        'info',
        ${sql.json({
          component: "grant-user-all-features",
          environment: "staging",
          service: "operator",
        })},
        ${store.id}, 'Granted time-limited staging feature access.',
        ${sql.json(["billing", "operator_exception", "staging"])},
        ${sql.json({ id: store.id, type: "store" })},
        ${store.tenant_id}, now(), now())`;

  for (const contract of input.zapiContracts)
    if (contract.changed) {
      const store = input.stores.find((item) => item.id === contract.storeId);
      if (!store)
        throw new Error(`Z-API store was not resolved: ${contract.storeId}`);
      await sql`INSERT INTO audit_events
        (action, actor_id, actor_kind, category, changes, criticality,
         data_classification, entity_id, entity_type, failure_tier, metadata,
         outcome, request_context, request_id, severity, source, store_id,
         summary, tags, target, tenant_id, created_at, updated_at)
        VALUES ('billing.addon.zapi.operator_override', 'staging_operator',
          'system', 'data_change', ${sql.json([
            {
              after: {
                providerEvidenceAbsent: contract.providerEvidenceAbsent,
                status: contract.status,
              },
              before: null,
              path: "billing_addon_contracts",
            },
          ])}, 'high', 'internal', ${contract.contractId},
          'billing_addon_contracts', 'required', ${sql.json({
            reason: input.reason,
            targetUserId: input.user.id,
          })}, 'succeeded', ${sql.json({ requestId: input.requestId })},
          ${input.requestId}, 'info', ${sql.json({
            component: "grant-user-all-features",
            environment: "staging",
            service: "operator",
          })}, ${store.id},
          'Granted staging Z-API capacity without provider payment evidence.',
          ${sql.json(["billing", "operator_exception", "staging", "zapi"])},
          ${sql.json({ id: contract.contractId, type: "billing_addon_contract" })},
          ${store.tenant_id}, now(), now())`;
    }
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
    const result = await runGrant(parseGrantArgs(process.argv.slice(2)));
    process.stdout.write(
      `${result.applied ? "Applied" : "Dry run"}: catalog ${result.catalogVersion}, ${result.featureCount} features [${result.features.join(", ")}] across ${result.storeCount} store(s), Z-API addon ${result.zapiAddonAvailable ? "available" : "unavailable"}, ending ${result.endsAt}${result.requestId ? ` (request ${result.requestId})` : ""}.\n`,
    );
  } catch (error) {
    process.stderr.write(
      `${error instanceof Error ? error.message : String(error)}\n`,
    );
    process.exitCode = 1;
  }
}
