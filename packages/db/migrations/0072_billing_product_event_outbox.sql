DO $$ BEGIN
  CREATE TYPE "billing_product_event_name" AS ENUM (
    'hire_created',
    'checkout_created',
    'payment_observed',
    'provider_bound',
    'contract_activated',
    'grace_entered',
    'free_fallback',
    'reconciliation_failed'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "billing_product_event_outbox_status" AS ENUM (
    'pending', 'processed', 'failed'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS "billing_product_event_outbox" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "updated_at" timestamptz DEFAULT now() NOT NULL,
  "attempt_count" integer DEFAULT 0 NOT NULL,
  "event_name" "billing_product_event_name" NOT NULL,
  "failure_code" varchar(120),
  "hire_id" uuid REFERENCES "billing_plan_hires"("id"),
  "idempotency_key" varchar(191) NOT NULL,
  "occurred_at" timestamptz DEFAULT now() NOT NULL,
  "processed_at" timestamptz,
  "properties" jsonb DEFAULT '{}'::jsonb NOT NULL,
  "provider_checkout_id" varchar(191),
  "provider_event_id" varchar(191),
  "provider_payment_id" varchar(191),
  "provider_subscription_id" varchar(191),
  "request_id" varchar(191),
  "status" "billing_product_event_outbox_status" DEFAULT 'pending' NOT NULL,
  "store_id" uuid REFERENCES "stores"("id"),
  "tenant_id" uuid NOT NULL REFERENCES "tenants"("id"),
  CONSTRAINT "billing_product_event_outbox_store_tenant_fk"
    FOREIGN KEY ("store_id", "tenant_id") REFERENCES "stores"("id", "tenant_id"),
  CONSTRAINT "billing_product_event_outbox_hire_scope_fk"
    FOREIGN KEY ("hire_id", "tenant_id", "store_id")
    REFERENCES "billing_plan_hires"("id", "tenant_id", "store_id"),
  CONSTRAINT "billing_product_event_outbox_hire_store_check"
    CHECK ("hire_id" IS NULL OR "store_id" IS NOT NULL),
  CONSTRAINT "billing_product_event_outbox_attempt_count_check"
    CHECK ("attempt_count" >= 0),
  CONSTRAINT "billing_product_event_outbox_properties_check"
    CHECK (
      jsonb_typeof("properties") = 'object'
      AND octet_length("properties"::text) <= 4096
    )
);

CREATE UNIQUE INDEX IF NOT EXISTS "billing_product_event_outbox_idempotency_unique"
  ON "billing_product_event_outbox" ("idempotency_key");
CREATE INDEX IF NOT EXISTS "billing_product_event_outbox_delivery_idx"
  ON "billing_product_event_outbox" ("status", "occurred_at");
CREATE INDEX IF NOT EXISTS "billing_product_event_outbox_scope_occurred_idx"
  ON "billing_product_event_outbox" ("tenant_id", "store_id", "occurred_at");
