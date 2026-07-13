ALTER TABLE "plans"
  ADD COLUMN IF NOT EXISTS "catalog_version" varchar(80) DEFAULT '2026-07-v1' NOT NULL,
  ADD COLUMN IF NOT EXISTS "is_default" boolean DEFAULT false NOT NULL,
  ADD COLUMN IF NOT EXISTS "published_at" timestamp with time zone DEFAULT now() NOT NULL;

ALTER TABLE "addons"
  ADD COLUMN IF NOT EXISTS "catalog_version" varchar(80) DEFAULT '2026-07-v1' NOT NULL,
  ADD COLUMN IF NOT EXISTS "included_in_trial" boolean DEFAULT false NOT NULL,
  ADD COLUMN IF NOT EXISTS "published_at" timestamp with time zone DEFAULT now() NOT NULL;

DROP INDEX IF EXISTS "plans_code_unique";
DROP INDEX IF EXISTS "addons_code_unique";

CREATE UNIQUE INDEX IF NOT EXISTS "plans_code_catalog_version_unique"
  ON "plans" ("code", "catalog_version");
CREATE INDEX IF NOT EXISTS "plans_status_published_idx"
  ON "plans" ("status", "published_at");
CREATE UNIQUE INDEX IF NOT EXISTS "addons_code_catalog_version_unique"
  ON "addons" ("code", "catalog_version");
CREATE INDEX IF NOT EXISTS "addons_status_published_idx"
  ON "addons" ("status", "published_at");

UPDATE "plans"
SET
  "catalog_version" = '2026-07-v1',
  "is_default" = true,
  "limits" = '{"vehicle_limit": 300, "seller_limit": 8}'::jsonb,
  "monthly_price_cents" = 29900,
  "name" = 'Growth',
  "published_at" = now(),
  "status" = 'active',
  "updated_at" = now()
WHERE "code" = 'growth';

INSERT INTO "plans" (
  "code", "catalog_version", "is_default", "limits",
  "monthly_price_cents", "name", "status"
)
VALUES (
  'growth', '2026-07-v1', true,
  '{"vehicle_limit": 300, "seller_limit": 8}'::jsonb,
  29900, 'Growth', 'active'
)
ON CONFLICT ("code", "catalog_version") DO NOTHING;

UPDATE "store_entitlements" AS entitlement
SET
  "ends_at" = subscription."current_period_end",
  "starts_at" = COALESCE(
    entitlement."starts_at",
    subscription."current_period_start"
  ),
  "status" = 'trialing',
  "updated_at" = now()
FROM "subscriptions" AS subscription
WHERE entitlement."tenant_id" = subscription."tenant_id"
  AND entitlement."source" = 'trial_bootstrap'
  AND subscription."status" = 'trialing'
  AND subscription."current_period_end" IS NOT NULL;

DELETE FROM "plan_features"
WHERE "feature_key" = 'crm'
  AND "plan_id" IN (
    SELECT "id" FROM "plans"
    WHERE "code" = 'growth' AND "catalog_version" = '2026-07-v1'
  );

INSERT INTO "plan_features" ("feature_key", "included", "limit_value", "plan_id")
SELECT feature.feature_key, feature.included, feature.limit_value, plan.id
FROM "plans" AS plan
CROSS JOIN (
  VALUES
    ('subdomain', 1, null::integer),
    ('automation', 1, null::integer),
    ('plate_lookup', 1, 300),
    ('custom_domain', 0, null::integer),
    ('external_api', 0, null::integer),
    ('nfe', 0, null::integer)
) AS feature(feature_key, included, limit_value)
WHERE plan.code = 'growth' AND plan.catalog_version = '2026-07-v1'
ON CONFLICT ("plan_id", "feature_key") DO UPDATE SET
  "included" = EXCLUDED."included",
  "limit_value" = EXCLUDED."limit_value",
  "updated_at" = now();

UPDATE "addons"
SET
  "catalog_version" = '2026-07-v1',
  "feature_key" = 'crm',
  "included_in_trial" = true,
  "monthly_price_cents" = 24999,
  "name" = 'CRM WhatsApp',
  "published_at" = now(),
  "status" = 'active',
  "updated_at" = now()
WHERE "code" = 'crm_whatsapp_instance';

INSERT INTO "addons" (
  "code", "catalog_version", "feature_key", "included_in_trial",
  "monthly_price_cents", "name", "status"
)
VALUES (
  'crm_whatsapp_instance', '2026-07-v1', 'crm', true,
  24999, 'CRM WhatsApp', 'active'
)
ON CONFLICT ("code", "catalog_version") DO NOTHING;
