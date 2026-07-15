ALTER TABLE "plan_features"
  ADD COLUMN IF NOT EXISTS "included_in_trial" boolean DEFAULT false NOT NULL;

INSERT INTO "plan_features" (
  "feature_key", "included", "included_in_trial", "limit_value", "plan_id"
)
SELECT feature.feature_key, feature.included, feature.included_in_trial,
       feature.limit_value, plan.id
FROM "plans" AS plan
CROSS JOIN (
  VALUES
    ('analytics', 1, true, null::integer),
    ('automation', 1, true, null::integer),
    ('compliance', 1, true, null::integer),
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

UPDATE "addons"
SET "included_in_trial" = false, "updated_at" = now()
WHERE "catalog_version" = '2026-07-v1';

UPDATE "subscriptions"
SET
  "current_period_end" = "current_period_start" + interval '14 days',
  "updated_at" = now()
WHERE "status" = 'trialing'
  AND "current_period_start" IS NOT NULL;

DELETE FROM "subscription_items" AS item
USING "subscriptions" AS subscription
WHERE item.subscription_id = subscription.id
  AND subscription.status = 'trialing';

UPDATE "store_entitlements" AS entitlement
SET
  "ends_at" = now(),
  "status" = 'inactive',
  "updated_at" = now()
FROM "subscriptions" AS subscription
WHERE entitlement.tenant_id = subscription.tenant_id
  AND subscription.status = 'trialing'
  AND entitlement.source = 'billing_catalog'
  AND entitlement.feature_key NOT IN (
    'analytics', 'automation', 'compliance', 'subdomain'
  );

INSERT INTO "store_entitlements" (
  "ends_at", "feature_key", "metadata", "source", "starts_at", "status",
  "store_id", "tenant_id"
)
SELECT
  subscription.current_period_end,
  feature.feature_key,
  jsonb_build_object(
    'catalogVersion', '2026-07-v1',
    'sourceDetail', 'safe_trial_catalog'
  ),
  'billing_catalog',
  subscription.current_period_start,
  'trialing',
  store.id,
  store.tenant_id
FROM "subscriptions" AS subscription
JOIN "stores" AS store ON store.tenant_id = subscription.tenant_id
CROSS JOIN (
  VALUES ('analytics'), ('automation'), ('compliance'), ('subdomain')
) AS feature(feature_key)
WHERE subscription.status = 'trialing'
  AND subscription.current_period_end > now()
ON CONFLICT ("store_id", "feature_key") DO UPDATE SET
  "ends_at" = EXCLUDED."ends_at",
  "metadata" = EXCLUDED."metadata",
  "source" = EXCLUDED."source",
  "starts_at" = EXCLUDED."starts_at",
  "status" = EXCLUDED."status",
  "updated_at" = now();

UPDATE "subscriptions"
SET "status" = 'expired', "updated_at" = now()
WHERE "status" = 'trialing'
  AND "current_period_end" <= now();
