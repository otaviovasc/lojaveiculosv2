ALTER TYPE "billing_provider_reconciliation_kind"
  ADD VALUE IF NOT EXISTS 'free_fallback';

ALTER TABLE "subscriptions"
  ADD COLUMN IF NOT EXISTS "provider_lifecycle_event_id" varchar(191),
  ADD COLUMN IF NOT EXISTS "provider_lifecycle_observed_at" timestamp with time zone;

ALTER TABLE "billing_plan_hires"
  ADD COLUMN IF NOT EXISTS "effective_at" timestamp with time zone;

CREATE INDEX IF NOT EXISTS "subscriptions_provider_lifecycle_observed_idx"
  ON "subscriptions" ("provider_lifecycle_observed_at");

CREATE INDEX IF NOT EXISTS "billing_plan_hires_effective_status_idx"
  ON "billing_plan_hires" ("status", "effective_at")
  WHERE "effective_at" IS NOT NULL;
