DO $$
BEGIN
  CREATE TYPE "billing_checkout_status" AS ENUM (
    'created',
    'paid',
    'cancelled',
    'expired'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS "billing_checkout_sessions" (
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  "callback_urls" jsonb DEFAULT '{}'::jsonb NOT NULL,
  "checkout_url" text NOT NULL,
  "expires_at" timestamp with time zone,
  "external_reference" varchar(200) NOT NULL,
  "provider" varchar(80) DEFAULT 'asaas' NOT NULL,
  "provider_checkout_id" varchar(191) NOT NULL,
  "raw" jsonb DEFAULT '{}'::jsonb NOT NULL,
  "status" "billing_checkout_status" DEFAULT 'created' NOT NULL,
  "store_id" uuid,
  "subscription_id" uuid NOT NULL REFERENCES "subscriptions"("id"),
  "tenant_id" uuid NOT NULL REFERENCES "tenants"("id")
);

ALTER TABLE "billing_checkout_sessions"
  ADD CONSTRAINT "billing_checkout_sessions_store_id_stores_id_fk"
  FOREIGN KEY ("store_id") REFERENCES "stores"("id");

CREATE INDEX IF NOT EXISTS "billing_checkout_sessions_tenant_status_idx"
  ON "billing_checkout_sessions" ("tenant_id", "status");

CREATE UNIQUE INDEX IF NOT EXISTS "billing_checkout_sessions_provider_checkout_unique"
  ON "billing_checkout_sessions" ("provider", "provider_checkout_id");
