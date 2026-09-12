ALTER TABLE "plan_features"
  ADD COLUMN IF NOT EXISTS "trial_limit_value" integer;
--> statement-breakpoint

-- Trial access is catalog-owned. Paid Growth keeps 300 plate lookups per
-- billing period, while an effective trial contract resolves to 10.
INSERT INTO "plan_features" (
  "feature_key",
  "included",
  "included_in_trial",
  "limit_value",
  "plan_id",
  "trial_limit_value"
)
SELECT
  feature.feature_key,
  feature.included,
  feature.included_in_trial,
  feature.limit_value,
  plan.id,
  feature.trial_limit_value
FROM "plans" AS plan
CROSS JOIN (
  VALUES
    ('analytics', 1, true, null::integer, null::integer),
    ('automation', 1, true, null::integer, null::integer),
    ('compliance', 1, true, null::integer, null::integer),
    ('plate_lookup', 1, true, 300, 10),
    ('subdomain', 1, true, null::integer, null::integer)
) AS feature(
  feature_key,
  included,
  included_in_trial,
  limit_value,
  trial_limit_value
)
WHERE plan.code = 'growth'
  AND plan.catalog_version = '2026-07-v1'
ON CONFLICT ("plan_id", "feature_key") DO UPDATE SET
  "included" = EXCLUDED."included",
  "included_in_trial" = EXCLUDED."included_in_trial",
  "limit_value" = EXCLUDED."limit_value",
  "trial_limit_value" = EXCLUDED."trial_limit_value",
  "updated_at" = now();
--> statement-breakpoint

UPDATE "plan_features" AS feature
SET
  "included_in_trial" = false,
  "trial_limit_value" = null,
  "updated_at" = now()
FROM "plans" AS plan
WHERE feature.plan_id = plan.id
  AND plan.code = 'growth'
  AND plan.catalog_version = '2026-07-v1'
  AND feature.feature_key NOT IN (
    'analytics',
    'automation',
    'compliance',
    'plate_lookup',
    'subdomain'
  );
--> statement-breakpoint

UPDATE "addons"
SET "included_in_trial" = false, "updated_at" = now()
WHERE "catalog_version" = '2026-07-v1';
--> statement-breakpoint

-- Restore the selected plan contract for every currently effective trial
-- store. The existing subscription dates are reused, so no trial is extended.
WITH current_trials AS (
  SELECT DISTINCT ON (subscription.tenant_id)
    subscription.id,
    subscription.current_period_start,
    subscription.tenant_id
  FROM "subscriptions" AS subscription
  WHERE subscription.status = 'trialing'
    AND (
      subscription.current_period_start IS NULL
      OR subscription.current_period_start <= now()
    )
    AND subscription.current_period_end > now()
  ORDER BY subscription.tenant_id, subscription.created_at DESC
)
INSERT INTO "subscription_items" (
  "item_type",
  "plan_id",
  "quantity",
  "starts_at",
  "store_id",
  "subscription_id",
  "tenant_id",
  "unit_amount_cents"
)
SELECT
  'plan',
  selected_plan.id,
  1,
  COALESCE(trial.current_period_start, now()),
  store.id,
  trial.id,
  store.tenant_id,
  selected_plan.monthly_price_cents
FROM current_trials AS trial
JOIN "stores" AS store
  ON store.tenant_id = trial.tenant_id
JOIN LATERAL (
  SELECT plan.id, plan.monthly_price_cents
  FROM "plans" AS plan
  WHERE plan.status = 'active'
    AND plan.is_default = true
    AND plan.published_at <= now()
  ORDER BY plan.published_at DESC
  LIMIT 1
) AS selected_plan ON true
WHERE store.is_deleted = false
  AND NOT EXISTS (
    SELECT 1
    FROM "subscription_items" AS current_item
    WHERE current_item.subscription_id = trial.id
      AND current_item.store_id = store.id
      AND current_item.tenant_id = store.tenant_id
      AND current_item.item_type = 'plan'
      AND (
        current_item.starts_at IS NULL
        OR current_item.starts_at <= now()
      )
      AND (
        current_item.ends_at IS NULL
        OR current_item.ends_at > now()
      )
  );
--> statement-breakpoint

-- Remove billing-catalog capabilities that are not trial-safe. Explicit
-- non-billing overrides remain untouched.
WITH current_trials AS (
  SELECT DISTINCT ON (subscription.tenant_id)
    subscription.tenant_id
  FROM "subscriptions" AS subscription
  WHERE subscription.status = 'trialing'
    AND (
      subscription.current_period_start IS NULL
      OR subscription.current_period_start <= now()
    )
    AND subscription.current_period_end > now()
  ORDER BY subscription.tenant_id, subscription.created_at DESC
)
UPDATE "store_entitlements" AS entitlement
SET
  "ends_at" = now(),
  "status" = 'inactive',
  "updated_at" = now()
FROM current_trials AS trial
WHERE entitlement.tenant_id = trial.tenant_id
  AND entitlement.source = 'billing_catalog'
  AND entitlement.feature_key NOT IN (
    'analytics',
    'automation',
    'compliance',
    'plate_lookup',
    'subdomain'
  );
--> statement-breakpoint

-- Backfill the complete safe trial projection for old accounts. Existing
-- start/end dates are preserved from the subscription, including trials with
-- only a few days remaining.
WITH current_trials AS (
  SELECT DISTINCT ON (subscription.tenant_id)
    subscription.current_period_end,
    subscription.current_period_start,
    subscription.tenant_id
  FROM "subscriptions" AS subscription
  WHERE subscription.status = 'trialing'
    AND (
      subscription.current_period_start IS NULL
      OR subscription.current_period_start <= now()
    )
    AND subscription.current_period_end > now()
  ORDER BY subscription.tenant_id, subscription.created_at DESC
)
INSERT INTO "store_entitlements" (
  "ends_at",
  "feature_key",
  "metadata",
  "source",
  "starts_at",
  "status",
  "store_id",
  "tenant_id"
)
SELECT
  trial.current_period_end,
  feature.feature_key,
  jsonb_build_object(
    'catalogVersion',
    '2026-07-v1',
    'sourceDetail',
    'safe_trial_catalog'
  ) || CASE
    WHEN feature.feature_key = 'plate_lookup'
      THEN jsonb_build_object('limitValue', 10)
    ELSE '{}'::jsonb
  END,
  'billing_catalog',
  trial.current_period_start,
  'trialing',
  store.id,
  store.tenant_id
FROM current_trials AS trial
JOIN "stores" AS store
  ON store.tenant_id = trial.tenant_id
CROSS JOIN (
  VALUES
    ('analytics'),
    ('automation'),
    ('compliance'),
    ('plate_lookup'),
    ('subdomain')
) AS feature(feature_key)
WHERE store.is_deleted = false
ON CONFLICT ("store_id", "feature_key") DO UPDATE SET
  "ends_at" = EXCLUDED."ends_at",
  "metadata" = EXCLUDED."metadata",
  "source" = EXCLUDED."source",
  "starts_at" = EXCLUDED."starts_at",
  "status" = EXCLUDED."status",
  "updated_at" = now()
WHERE "store_entitlements"."source" IN ('billing_catalog', 'trial_bootstrap')
  OR "store_entitlements"."status" <> 'active';
