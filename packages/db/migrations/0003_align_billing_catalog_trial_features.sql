-- Align the default plan's feature catalog with the canonical seed
-- (docker/postgres/seed/product/20-billing.sql). The original
-- 0001_seed_billing_catalog.sql omitted `analytics` and `compliance` and
-- diverged on `custom_domain`/`plate_lookup`, so trial owners never received the
-- `analytics` entitlement and the managerial dashboard (assertEntitlement
-- "analytics") returned 403. Trial-included features must be:
-- analytics, automation, compliance, subdomain.
--
-- Idempotent upsert keyed on (plan_id, feature_key); resolves plan_id by
-- (code, catalog_version) so it works regardless of the plan's generated UUID.
-- Only affects entitlements computed for stores provisioned after it runs.

INSERT INTO "plan_features" (
  "feature_key", "included", "included_in_trial", "limit_value", "plan_id"
)
SELECT
  feature.feature_key,
  feature.included,
  feature.included_in_trial,
  feature.limit_value,
  plan.id
FROM "plans" AS plan
CROSS JOIN (
  VALUES
    ('analytics', 1, true, null::integer),
    ('automation', 1, true, null::integer),
    ('compliance', 1, true, null::integer),
    ('crm', 0, false, null::integer),
    ('custom_domain', 1, false, null::integer),
    ('external_api', 0, false, null::integer),
    ('marketplace', 0, false, null::integer),
    ('nfe', 0, false, null::integer),
    ('plate_lookup', 1, false, 300),
    ('simulations', 0, false, null::integer),
    ('subdomain', 1, true, null::integer)
) AS feature(feature_key, included, included_in_trial, limit_value)
WHERE plan.code = 'growth' AND plan.catalog_version = '2026-07-v1'
ON CONFLICT ("plan_id", "feature_key") DO UPDATE SET
  "included" = EXCLUDED."included",
  "included_in_trial" = EXCLUDED."included_in_trial",
  "limit_value" = EXCLUDED."limit_value",
  "updated_at" = now();
