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

export async function runGrant(input, env = process.env) {
  if (!env.DATABASE_URL) throw new Error("DATABASE_URL must be configured.");
  if (input.apply && env.APP_ENV !== "staging")
    throw new Error(
      "Applying all-feature access is restricted to APP_ENV=staging.",
    );
  if (input.apply && !env.AUDIT_DATABASE_URL)
    throw new Error("AUDIT_DATABASE_URL is required for an applied grant.");

  const product = postgres(
    env.DATABASE_URL,
    connectionOptions(env.DATABASE_URL),
  );
  const audit = input.apply
    ? postgres(
        env.AUDIT_DATABASE_URL,
        connectionOptions(env.AUDIT_DATABASE_URL),
      )
    : null;
  try {
    const user = await resolveUser(product, input.userId);
    const stores = await resolveStores(product, user.id);
    const features = await resolveFeatures(product);
    const startsAt = new Date();
    const endsAt = oneCalendarMonthFrom(startsAt);
    const preview = {
      endsAt: endsAt.toISOString(),
      featureCount: features.length,
      storeCount: stores.length,
      userId: user.id,
    };
    if (!input.apply) return { applied: false, ...preview };

    const requestId = `staging-entitlement-grant-${randomUUID()}`;
    await product.begin(async (tx) => {
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
      await persistRequiredAudit(audit, {
        endsAt,
        features,
        reason: input.reason,
        requestId,
        stores,
        user,
      });
    });
    return { applied: true, requestId, ...preview };
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

async function resolveFeatures(sql) {
  const rows = await sql`WITH catalog AS (
      SELECT id, catalog_version FROM plans
      WHERE status='active' AND is_default=true AND published_at <= now()
      ORDER BY published_at DESC LIMIT 1
    )
    SELECT feature_key FROM plan_features
      WHERE plan_id=(SELECT id FROM catalog)
    UNION
    SELECT addon.feature_key FROM addons AS addon, catalog
      WHERE addon.catalog_version=catalog.catalog_version
        AND addon.status='active' AND addon.published_at <= now()
    ORDER BY feature_key`;
  if (!rows.length)
    throw new Error("The active billing catalog has no features.");
  return rows.map((row) => row.feature_key);
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
      `${result.applied ? "Applied" : "Dry run"}: ${result.featureCount} features across ${result.storeCount} store(s), ending ${result.endsAt}${result.requestId ? ` (request ${result.requestId})` : ""}.\n`,
    );
  } catch (error) {
    process.stderr.write(
      `${error instanceof Error ? error.message : String(error)}\n`,
    );
    process.exitCode = 1;
  }
}
