CREATE EXTENSION IF NOT EXISTS btree_gist;

ALTER TYPE "provider_event_status" ADD VALUE IF NOT EXISTS 'pending_reconciliation';
ALTER TYPE "billing_provider_reconciliation_kind" ADD VALUE IF NOT EXISTS 'zapi_retirement';

DO $$ BEGIN
  CREATE TYPE "billing_plan_hire_status" AS ENUM (
    'created', 'checkout_created', 'payment_pending', 'activation_pending',
    'paid_active', 'downgrade_scheduled', 'cancelled', 'expired', 'failed',
    'reconciliation_failed'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "billing_plan_hire_checkout_mode" AS ENUM ('free', 'checkout', 'quote_required');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "billing_plan_quote_status" AS ENUM ('requested', 'approved', 'rejected', 'expired', 'used');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "billing_packaging_cutover_status" AS ENUM ('running', 'completed', 'failed');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS "billing_packaging_cutovers" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "updated_at" timestamptz DEFAULT now() NOT NULL,
  "completed_at" timestamptz,
  "failure_code" varchar(120),
  "status" "billing_packaging_cutover_status" DEFAULT 'running' NOT NULL,
  "version" varchar(80) NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS "billing_packaging_cutovers_version_unique"
  ON "billing_packaging_cutovers" ("version");

ALTER TABLE "billing_customers" ALTER COLUMN "provider_customer_id" DROP NOT NULL;
ALTER TABLE "subscriptions" ALTER COLUMN "status" SET DEFAULT 'active';
UPDATE "billing_customers"
SET "provider_customer_id" = NULL, "updated_at" = now()
WHERE "provider_customer_id" LIKE 'local\_%' ESCAPE '\';
UPDATE "subscriptions"
SET "provider_subscription_id" = NULL, "updated_at" = now()
WHERE "provider_subscription_id" LIKE 'local\_%' ESCAPE '\';

CREATE UNIQUE INDEX IF NOT EXISTS "billing_customers_id_tenant_unique"
  ON "billing_customers" ("id", "tenant_id");

DO $$ BEGIN
  ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_customer_tenant_fk"
    FOREIGN KEY ("billing_customer_id", "tenant_id")
    REFERENCES "billing_customers" ("id", "tenant_id");
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "subscription_items" ADD CONSTRAINT "subscription_items_type_shape_check"
    CHECK (
      ("item_type" = 'plan' AND "plan_id" IS NOT NULL AND "addon_id" IS NULL) OR
      ("item_type" = 'addon' AND "addon_id" IS NOT NULL AND "plan_id" IS NULL)
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "subscription_items" ADD CONSTRAINT "subscription_items_effective_window_check"
    CHECK ("ends_at" IS NULL OR "starts_at" IS NULL OR "ends_at" > "starts_at");
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "subscription_items" ADD CONSTRAINT "subscription_items_store_tenant_fk"
    FOREIGN KEY ("store_id", "tenant_id") REFERENCES "stores" ("id", "tenant_id");
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "subscription_items" ADD CONSTRAINT "subscription_items_subscription_tenant_fk"
    FOREIGN KEY ("subscription_id", "tenant_id") REFERENCES "subscriptions" ("id", "tenant_id");
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS "billing_plan_quotes" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "updated_at" timestamptz DEFAULT now() NOT NULL,
  "approved_at" timestamptz,
  "approved_by_actor_id" varchar(191),
  "catalog_version" varchar(80) NOT NULL,
  "expires_at" timestamptz,
  "plan_id" uuid NOT NULL REFERENCES "plans"("id"),
  "quoted_cents" integer,
  "requested_by_actor_id" varchar(191) NOT NULL,
  "status" "billing_plan_quote_status" DEFAULT 'requested' NOT NULL,
  "store_id" uuid NOT NULL REFERENCES "stores"("id"),
  "tenant_id" uuid NOT NULL REFERENCES "tenants"("id"),
  CONSTRAINT "billing_plan_quotes_approved_price_check"
    CHECK ("status" <> 'approved' OR "quoted_cents" IS NOT NULL),
  CONSTRAINT "billing_plan_quotes_store_tenant_fk"
    FOREIGN KEY ("store_id", "tenant_id") REFERENCES "stores"("id", "tenant_id")
);
CREATE INDEX IF NOT EXISTS "billing_plan_quotes_store_status_idx"
  ON "billing_plan_quotes" ("store_id", "status", "created_at");
CREATE UNIQUE INDEX IF NOT EXISTS "billing_plan_quotes_scoped_identity_unique"
  ON "billing_plan_quotes" ("id", "tenant_id", "store_id");

CREATE TABLE IF NOT EXISTS "billing_plan_hires" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "updated_at" timestamptz DEFAULT now() NOT NULL,
  "activated_at" timestamptz,
  "catalog_version" varchar(80) NOT NULL,
  "checkout_mode" "billing_plan_hire_checkout_mode" NOT NULL,
  "completed_at" timestamptz,
  "effective_subscription_item_id" uuid REFERENCES "subscription_items"("id"),
  "failure_code" varchar(120),
  "idempotency_key" varchar(191) NOT NULL,
  "plan_id" uuid NOT NULL REFERENCES "plans"("id"),
  "plan_snapshot" jsonb NOT NULL,
  "provider" varchar(80) DEFAULT 'asaas' NOT NULL,
  "provider_checkout_id" varchar(191),
  "provider_payment_id" varchar(191),
  "provider_subscription_id" varchar(191),
  "quoted_cents" integer NOT NULL,
  "quote_id" uuid REFERENCES "billing_plan_quotes"("id"),
  "status" "billing_plan_hire_status" DEFAULT 'created' NOT NULL,
  "store_id" uuid NOT NULL REFERENCES "stores"("id"),
  "subscription_id" uuid NOT NULL REFERENCES "subscriptions"("id"),
  "tenant_id" uuid NOT NULL REFERENCES "tenants"("id"),
  CONSTRAINT "billing_plan_hires_quote_mode_check"
    CHECK (("checkout_mode" = 'quote_required' AND "quote_id" IS NOT NULL) OR "checkout_mode" <> 'quote_required'),
  CONSTRAINT "billing_plan_hires_non_negative_quote_check" CHECK ("quoted_cents" >= 0),
  CONSTRAINT "billing_plan_hires_store_tenant_fk"
    FOREIGN KEY ("store_id", "tenant_id") REFERENCES "stores"("id", "tenant_id"),
  CONSTRAINT "billing_plan_hires_subscription_tenant_fk"
    FOREIGN KEY ("subscription_id", "tenant_id") REFERENCES "subscriptions"("id", "tenant_id"),
  CONSTRAINT "billing_plan_hires_effective_item_scope_fk"
    FOREIGN KEY ("effective_subscription_item_id", "subscription_id", "tenant_id", "store_id")
    REFERENCES "subscription_items" ("id", "subscription_id", "tenant_id", "store_id"),
  CONSTRAINT "billing_plan_hires_quote_scope_fk"
    FOREIGN KEY ("quote_id", "tenant_id", "store_id")
    REFERENCES "billing_plan_quotes" ("id", "tenant_id", "store_id")
);
CREATE INDEX IF NOT EXISTS "billing_plan_hires_store_status_idx"
  ON "billing_plan_hires" ("store_id", "status", "created_at");
CREATE UNIQUE INDEX IF NOT EXISTS "billing_plan_hires_store_idempotency_unique"
  ON "billing_plan_hires" ("tenant_id", "store_id", "idempotency_key");
CREATE UNIQUE INDEX IF NOT EXISTS "billing_plan_hires_one_open_store_unique"
  ON "billing_plan_hires" ("tenant_id", "store_id")
  WHERE "status" IN ('created', 'checkout_created', 'payment_pending', 'activation_pending');
CREATE UNIQUE INDEX IF NOT EXISTS "billing_plan_hires_provider_checkout_unique"
  ON "billing_plan_hires" ("provider", "provider_checkout_id") WHERE "provider_checkout_id" IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS "billing_plan_hires_provider_payment_unique"
  ON "billing_plan_hires" ("provider", "provider_payment_id") WHERE "provider_payment_id" IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS "billing_plan_hires_scoped_identity_unique"
  ON "billing_plan_hires" ("id", "tenant_id", "store_id");

CREATE TABLE IF NOT EXISTS "billing_plan_hire_transitions" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "updated_at" timestamptz DEFAULT now() NOT NULL,
  "failure_code" varchar(120),
  "from_status" "billing_plan_hire_status",
  "hire_id" uuid NOT NULL REFERENCES "billing_plan_hires"("id"),
  "metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
  "provider_event_id" varchar(191),
  "store_id" uuid NOT NULL REFERENCES "stores"("id"),
  "tenant_id" uuid NOT NULL REFERENCES "tenants"("id"),
  "to_status" "billing_plan_hire_status" NOT NULL,
  CONSTRAINT "billing_plan_hire_transitions_hire_scope_fk"
    FOREIGN KEY ("hire_id", "tenant_id", "store_id")
    REFERENCES "billing_plan_hires" ("id", "tenant_id", "store_id")
);
CREATE INDEX IF NOT EXISTS "billing_plan_hire_transitions_hire_created_idx"
  ON "billing_plan_hire_transitions" ("hire_id", "created_at");

ALTER TABLE "billing_checkout_sessions" ADD COLUMN IF NOT EXISTS "plan_hire_id" uuid;
DO $$ BEGIN
  ALTER TABLE "billing_checkout_sessions" ADD CONSTRAINT "billing_checkout_sessions_plan_hire_fk"
    FOREIGN KEY ("plan_hire_id") REFERENCES "billing_plan_hires"("id");
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "billing_checkout_sessions" ADD CONSTRAINT "billing_checkout_sessions_plan_hire_scope_fk"
    FOREIGN KEY ("plan_hire_id", "tenant_id", "store_id")
    REFERENCES "billing_plan_hires" ("id", "tenant_id", "store_id");
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
CREATE INDEX IF NOT EXISTS "billing_checkout_sessions_plan_hire_idx"
  ON "billing_checkout_sessions" ("plan_hire_id");

UPDATE "subscription_items"
SET "ends_at" = COALESCE("ends_at", now()), "updated_at" = now()
WHERE "item_type" = 'addon' AND ("ends_at" IS NULL OR "ends_at" > now());
UPDATE "store_entitlements"
SET "status" = 'inactive', "ends_at" = COALESCE("ends_at", now()), "updated_at" = now()
WHERE "feature_key" = 'crm_zapi' AND "status" <> 'inactive';
UPDATE "billing_addon_contracts"
SET "status" = 'cancelled', "cancelled_at" = COALESCE("cancelled_at", now()),
    "cancellation_sync_pending" = false, "updated_at" = now()
WHERE "status" <> 'cancelled';

DO $$ BEGIN
  ALTER TABLE "subscription_items" ADD CONSTRAINT "subscription_items_no_overlapping_store_plans"
    EXCLUDE USING gist (
      "store_id" WITH =,
      tstzrange(COALESCE("starts_at", '-infinity'::timestamptz), COALESCE("ends_at", 'infinity'::timestamptz), '[)') WITH &&
    ) WHERE ("item_type" = 'plan' AND "store_id" IS NOT NULL);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
