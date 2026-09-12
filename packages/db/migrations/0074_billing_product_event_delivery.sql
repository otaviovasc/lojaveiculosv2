ALTER TABLE "billing_product_event_outbox"
  ADD COLUMN IF NOT EXISTS "last_attempt_at" timestamptz,
  ADD COLUMN IF NOT EXISTS "lease_expires_at" timestamptz,
  ADD COLUMN IF NOT EXISTS "lease_token" varchar(191),
  ADD COLUMN IF NOT EXISTS "next_attempt_at" timestamptz;

UPDATE "billing_product_event_outbox"
SET "next_attempt_at" = COALESCE("next_attempt_at", "occurred_at", now())
WHERE "next_attempt_at" IS NULL;

ALTER TABLE "billing_product_event_outbox"
  ALTER COLUMN "next_attempt_at" SET DEFAULT now(),
  ALTER COLUMN "next_attempt_at" SET NOT NULL;

DO $$ BEGIN
  ALTER TABLE "billing_product_event_outbox"
    ADD CONSTRAINT "billing_product_event_outbox_lease_pair_check"
    CHECK (("lease_token" IS NULL) = ("lease_expires_at" IS NULL));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DROP INDEX IF EXISTS "billing_product_event_outbox_delivery_idx";
CREATE INDEX IF NOT EXISTS "billing_product_event_outbox_delivery_idx"
  ON "billing_product_event_outbox"
  ("status", "next_attempt_at", "lease_expires_at");
