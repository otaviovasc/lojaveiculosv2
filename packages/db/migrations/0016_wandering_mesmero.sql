DROP INDEX "crm_connections_store_provider_name_unique";--> statement-breakpoint
DROP INDEX "vehicle_units_store_plate_unique";--> statement-breakpoint
DROP INDEX "vehicle_units_store_stock_unique";--> statement-breakpoint
DROP INDEX "vehicle_units_store_vin_unique";--> statement-breakpoint
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
      FROM "crm_connections"
     WHERE "status" <> 'archived'
       AND "provider" IN ('zapi', 'composio_whatsapp')
     GROUP BY "store_id", "provider"
    HAVING count(*) > 1
  ) THEN
    RAISE EXCEPTION 'CRM connection migration blocked: archive duplicate active provider connections first';
  END IF;
  IF EXISTS (
    SELECT 1
      FROM "crm_connections" AS connection
      JOIN "stores" AS store ON store."id" = connection."store_id"
     WHERE store."tenant_id" <> connection."tenant_id"
  ) THEN
    RAISE EXCEPTION 'CRM connection migration blocked: store and connection tenant scopes disagree';
  END IF;
END $$;--> statement-breakpoint
ALTER TABLE "crm_connections" ADD CONSTRAINT "crm_connections_store_tenant_fk" FOREIGN KEY ("store_id","tenant_id") REFERENCES "public"."stores"("id","tenant_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "crm_connections_store_provider_active_unique" ON "crm_connections" USING btree ("store_id","provider") WHERE "crm_connections"."status" <> 'archived' and "crm_connections"."provider" in ('zapi', 'composio_whatsapp');--> statement-breakpoint
CREATE INDEX "crm_connections_zapi_sandbox_cleanup_idx" ON "crm_connections" USING btree ("updated_at") WHERE "crm_connections"."provider" = 'zapi' and "crm_connections"."status" = 'sandbox';--> statement-breakpoint
CREATE UNIQUE INDEX "vehicle_units_store_plate_unique" ON "vehicle_units" USING btree ("store_id","plate") WHERE "vehicle_units"."is_deleted" = false AND "vehicle_units"."deleted_at" IS NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "vehicle_units_store_stock_unique" ON "vehicle_units" USING btree ("store_id","stock_number") WHERE "vehicle_units"."is_deleted" = false AND "vehicle_units"."deleted_at" IS NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "vehicle_units_store_vin_unique" ON "vehicle_units" USING btree ("store_id","vin") WHERE "vehicle_units"."is_deleted" = false AND "vehicle_units"."deleted_at" IS NULL;--> statement-breakpoint
CREATE TYPE "public"."billing_addon_contract_status" AS ENUM('pending', 'scheduled', 'paid_awaiting_setup', 'active', 'cancelled');--> statement-breakpoint
ALTER TABLE "addons" ADD COLUMN "limits" jsonb DEFAULT '{}'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "plans" ALTER COLUMN "catalog_version" SET DEFAULT '2026-08-v1';--> statement-breakpoint
ALTER TABLE "addons" ALTER COLUMN "catalog_version" SET DEFAULT '2026-08-v1';--> statement-breakpoint
CREATE UNIQUE INDEX "subscriptions_id_tenant_unique" ON "subscriptions" USING btree ("id","tenant_id");--> statement-breakpoint
CREATE UNIQUE INDEX "subscription_items_scoped_identity_unique" ON "subscription_items" USING btree ("id","subscription_id","tenant_id","store_id");--> statement-breakpoint
CREATE UNIQUE INDEX "payments_scoped_identity_unique" ON "payments" USING btree ("id","subscription_id","tenant_id");--> statement-breakpoint
CREATE TABLE "billing_addon_contracts" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  "addon_id" uuid NOT NULL,
  "activated_by_payment_id" uuid,
  "activated_by_provider_checkout_id" varchar(191),
  "activated_by_provider_event_id" varchar(191),
  "cancelled_at" timestamp with time zone,
  "cancellation_scheduled_for" timestamp with time zone,
  "cancellation_sync_pending" boolean DEFAULT false NOT NULL,
  "expected_renewal_amount_cents" integer,
  "paid_at" timestamp with time zone,
  "scheduled_for" timestamp with time zone,
  "setup_completed_at" timestamp with time zone,
  "setup_connection_id" uuid,
  "status" "billing_addon_contract_status" DEFAULT 'pending' NOT NULL,
  "store_id" uuid NOT NULL,
  "subscription_id" uuid NOT NULL,
  "subscription_item_id" uuid NOT NULL,
  "support_code" varchar(32) DEFAULT ('ZAPI-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 12))) NOT NULL,
  "tenant_id" uuid NOT NULL
);--> statement-breakpoint
ALTER TABLE "billing_addon_contracts" ADD CONSTRAINT "billing_addon_contracts_addon_id_addons_id_fk" FOREIGN KEY ("addon_id") REFERENCES "public"."addons"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "billing_addon_contracts" ADD CONSTRAINT "billing_addon_contracts_store_tenant_fk" FOREIGN KEY ("store_id","tenant_id") REFERENCES "public"."stores"("id","tenant_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "billing_addon_contracts" ADD CONSTRAINT "billing_addon_contracts_subscription_tenant_fk" FOREIGN KEY ("subscription_id","tenant_id") REFERENCES "public"."subscriptions"("id","tenant_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "billing_addon_contracts" ADD CONSTRAINT "billing_addon_contracts_item_scope_fk" FOREIGN KEY ("subscription_item_id","subscription_id","tenant_id","store_id") REFERENCES "public"."subscription_items"("id","subscription_id","tenant_id","store_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "billing_addon_contracts" ADD CONSTRAINT "billing_addon_contracts_payment_scope_fk" FOREIGN KEY ("activated_by_payment_id","subscription_id","tenant_id") REFERENCES "public"."payments"("id","subscription_id","tenant_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "billing_addon_contracts_subscription_status_idx" ON "billing_addon_contracts" USING btree ("subscription_id","status","scheduled_for");--> statement-breakpoint
CREATE INDEX "billing_addon_contracts_store_status_idx" ON "billing_addon_contracts" USING btree ("store_id","status");--> statement-breakpoint
CREATE UNIQUE INDEX "billing_addon_contracts_item_unique" ON "billing_addon_contracts" USING btree ("subscription_item_id");--> statement-breakpoint
CREATE UNIQUE INDEX "billing_addon_contracts_open_store_addon_unique" ON "billing_addon_contracts" USING btree ("store_id","addon_id") WHERE "status" <> 'cancelled';--> statement-breakpoint
CREATE UNIQUE INDEX "billing_addon_contracts_support_code_unique" ON "billing_addon_contracts" USING btree ("support_code");--> statement-breakpoint
INSERT INTO "plans" (
  "id", "catalog_version", "code", "is_default", "limits", "monthly_price_cents",
  "name", "published_at", "status"
)
SELECT
  CASE legacy."code"
    WHEN 'basico' THEN '82121212-1212-4212-8212-121212121210'::uuid
    WHEN 'premium' THEN '82121212-1212-4212-8212-121212121211'::uuid
    WHEN 'growth' THEN '82121212-1212-4212-8212-121212121212'::uuid
    WHEN 'estoque' THEN '82121212-1212-4212-8212-121212121213'::uuid
    WHEN 'pro' THEN '82121212-1212-4212-8212-121212121214'::uuid
    ELSE gen_random_uuid()
  END,
  '2026-08-v1', legacy."code", legacy."is_default", legacy."limits",
  legacy."monthly_price_cents", legacy."name", now(), 'active'
FROM "plans" legacy
WHERE legacy."catalog_version" = '2026-07-v1'
ON CONFLICT ("code", "catalog_version") DO NOTHING;--> statement-breakpoint
INSERT INTO "plan_features" (
  "feature_key", "included", "included_in_trial", "limit_value", "plan_id",
  "trial_limit_value"
)
SELECT
  feature."feature_key", feature."included", feature."included_in_trial",
  feature."limit_value", current_plan."id", feature."trial_limit_value"
FROM "plans" legacy_plan
JOIN "plan_features" feature ON feature."plan_id" = legacy_plan."id"
JOIN "plans" current_plan
  ON current_plan."code" = legacy_plan."code"
 AND current_plan."catalog_version" = '2026-08-v1'
WHERE legacy_plan."catalog_version" = '2026-07-v1'
ON CONFLICT ("plan_id", "feature_key") DO NOTHING;--> statement-breakpoint
INSERT INTO "addons" (
  "id", "catalog_version", "code", "feature_key", "included_in_trial", "limits",
  "monthly_price_cents", "name", "published_at", "status"
)
SELECT
  CASE legacy."code"
    WHEN 'marketplace_connectors' THEN '85151515-1515-4515-8515-151515151516'::uuid
    WHEN 'fiscal_spedy' THEN '85151515-1515-4515-8515-151515151517'::uuid
    WHEN 'public_api_access' THEN '85151515-1515-4515-8515-151515151518'::uuid
    WHEN 'simulations_pro' THEN '85151515-1515-4515-8515-151515151519'::uuid
    ELSE gen_random_uuid()
  END,
  '2026-08-v1', legacy."code", legacy."feature_key", legacy."included_in_trial",
  legacy."limits", legacy."monthly_price_cents", legacy."name", now(), 'active'
FROM "addons" legacy
WHERE legacy."catalog_version" = '2026-07-v1'
  AND legacy."code" <> 'crm_whatsapp_instance'
ON CONFLICT ("code", "catalog_version") DO NOTHING;--> statement-breakpoint
INSERT INTO "addons" (
  "id", "catalog_version", "code", "feature_key", "included_in_trial", "limits",
  "monthly_price_cents", "name", "published_at", "status"
)
VALUES
  (
    '85151515-1515-4515-8515-151515151515', '2026-08-v1', 'crm_core', 'crm', false,
    '{"composio_tool_executions_per_billing_month":10000,"enforcement":"soft","included_channels":["whatsapp_official","instagram"]}'::jsonb,
    17900, 'CRM', now(), 'active'
  ),
  (
    '85151515-1515-4515-8515-151515151520', '2026-08-v1', 'crm_zapi', 'crm_zapi', false, '{}'::jsonb,
    10000, 'Z-API para CRM', now(), 'active'
  )
ON CONFLICT ("code", "catalog_version") DO NOTHING;--> statement-breakpoint
UPDATE "subscription_items" item
SET
  "addon_id" = current_addon."id",
  "unit_amount_cents" = 17900,
  "updated_at" = now()
FROM "addons" legacy_addon, "addons" current_addon, "subscriptions" subscription
WHERE item."addon_id" = legacy_addon."id"
  AND legacy_addon."code" = 'crm_whatsapp_instance'
  AND legacy_addon."catalog_version" = '2026-07-v1'
  AND current_addon."code" = 'crm_core'
  AND current_addon."catalog_version" = '2026-08-v1'
  AND subscription."id" = item."subscription_id"
  AND subscription."tenant_id" = item."tenant_id"
  AND subscription."status" = 'active'
  AND (item."ends_at" IS NULL OR item."ends_at" > now());--> statement-breakpoint
INSERT INTO "subscription_items" (
  "addon_id", "item_type", "quantity", "starts_at", "store_id",
  "subscription_id", "tenant_id", "unit_amount_cents"
)
SELECT
  zapi_addon."id", 'addon', 1,
  COALESCE(subscription."current_period_start", now()), connection."store_id",
  subscription."id", connection."tenant_id", 10000
FROM "crm_connections" connection
JOIN "subscriptions" subscription
  ON subscription."tenant_id" = connection."tenant_id"
 AND subscription."status" = 'active'
JOIN "addons" zapi_addon
  ON zapi_addon."code" = 'crm_zapi'
 AND zapi_addon."catalog_version" = '2026-08-v1'
WHERE connection."provider" = 'zapi'
  AND connection."status" <> 'archived'
  AND EXISTS (
    SELECT 1
    FROM "subscription_items" core_item
    JOIN "addons" core_addon ON core_addon."id" = core_item."addon_id"
    WHERE core_item."subscription_id" = subscription."id"
      AND core_item."store_id" = connection."store_id"
      AND core_item."tenant_id" = connection."tenant_id"
      AND core_addon."code" = 'crm_core'
      AND (core_item."ends_at" IS NULL OR core_item."ends_at" > now())
  )
  AND NOT EXISTS (
    SELECT 1
    FROM "subscription_items" existing_item
    WHERE existing_item."subscription_id" = subscription."id"
      AND existing_item."store_id" = connection."store_id"
      AND existing_item."addon_id" = zapi_addon."id"
      AND (existing_item."ends_at" IS NULL OR existing_item."ends_at" > now())
  );--> statement-breakpoint
INSERT INTO "billing_addon_contracts" (
  "addon_id", "paid_at", "status", "store_id", "subscription_id",
  "subscription_item_id", "tenant_id"
)
SELECT
  item."addon_id", COALESCE(subscription."current_period_start", now()),
  'paid_awaiting_setup', item."store_id", item."subscription_id", item."id",
  item."tenant_id"
FROM "subscription_items" item
JOIN "addons" addon ON addon."id" = item."addon_id"
JOIN "subscriptions" subscription ON subscription."id" = item."subscription_id"
JOIN "crm_connections" connection
  ON connection."tenant_id" = item."tenant_id"
 AND connection."store_id" = item."store_id"
 AND connection."provider" = 'zapi'
 AND connection."status" <> 'archived'
WHERE addon."code" = 'crm_zapi'
  AND addon."catalog_version" = '2026-08-v1'
  AND subscription."status" = 'active'
  AND item."store_id" IS NOT NULL
ON CONFLICT ("subscription_item_id") DO NOTHING;--> statement-breakpoint
INSERT INTO "store_entitlements" (
  "feature_key", "metadata", "source", "starts_at", "status", "store_id",
  "tenant_id"
)
SELECT DISTINCT
  'crm_zapi',
  '{"catalogVersion":"2026-08-v1","backfillEvidence":"active_zapi_connection","webhookReconfigurationRequired":true}'::jsonb,
  'billing_catalog', COALESCE(subscription."current_period_start", now()),
  'active'::"public"."entitlement_status", contract."store_id", contract."tenant_id"
FROM "billing_addon_contracts" contract
JOIN "subscriptions" subscription ON subscription."id" = contract."subscription_id"
WHERE contract."status" IN ('paid_awaiting_setup', 'active')
  AND subscription."status" = 'active'
ON CONFLICT ("store_id", "feature_key") DO UPDATE SET
  "ends_at" = null,
  "metadata" = EXCLUDED."metadata",
  "source" = EXCLUDED."source",
  "starts_at" = EXCLUDED."starts_at",
  "status" = 'active'::"public"."entitlement_status",
  "updated_at" = now();--> statement-breakpoint
UPDATE "crm_connections"
SET
  "metadata" = COALESCE("metadata", '{}'::jsonb) || '{"webhookReconfigurationRequired":true,"webhookTrustVersion":"per_connection_v1_required"}'::jsonb,
  "updated_at" = now()
WHERE "provider" = 'zapi'
  AND "status" <> 'archived';--> statement-breakpoint
ALTER TYPE "public"."provider_event_status" ADD VALUE IF NOT EXISTS 'processing' BEFORE 'processed';--> statement-breakpoint
ALTER TABLE "provider_events" ADD COLUMN "processing_attempts" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "provider_events" ADD COLUMN "processing_started_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "provider_events" ADD COLUMN "processing_token" uuid;--> statement-breakpoint
CREATE INDEX "provider_events_processing_claim_idx" ON "provider_events" USING btree ("status","processing_started_at");
