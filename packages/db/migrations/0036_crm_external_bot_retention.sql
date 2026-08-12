ALTER TABLE "crm_external_bot_event_outbox" ALTER COLUMN "grant_token" DROP NOT NULL;

UPDATE "crm_external_bot_event_outbox"
SET "grant_token" = NULL,
    "payload" = CASE
      WHEN "grant_expires_at" <= now() THEN '{}'::jsonb
      ELSE "payload"
    END,
    "updated_at" = now()
WHERE "grant_token" IS NOT NULL
  AND ("state" = 'delivered' OR "grant_expires_at" <= now());
