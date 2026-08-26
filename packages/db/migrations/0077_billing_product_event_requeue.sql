ALTER TABLE "billing_product_event_outbox"
  ADD COLUMN IF NOT EXISTS "requeue_count" integer DEFAULT 0 NOT NULL;

DO $$ BEGIN
  ALTER TABLE "billing_product_event_outbox"
    ADD CONSTRAINT "billing_product_event_outbox_requeue_count_check"
    CHECK ("requeue_count" >= 0);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
