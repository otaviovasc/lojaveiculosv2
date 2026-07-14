ALTER TABLE "lead_activities"
  ADD COLUMN IF NOT EXISTS "idempotency_fingerprint" varchar(64),
  ADD COLUMN IF NOT EXISTS "idempotency_key" varchar(191);

CREATE UNIQUE INDEX IF NOT EXISTS "lead_activities_store_idempotency_key_unique"
  ON "lead_activities" ("store_id", "idempotency_key");
