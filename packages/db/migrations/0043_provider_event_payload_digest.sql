ALTER TABLE "provider_events"
  ADD COLUMN "payload_digest" varchar(64);
--> statement-breakpoint
ALTER TABLE "provider_events"
  ADD CONSTRAINT "provider_events_payload_digest_check"
  CHECK ("payload_digest" IS NULL OR "payload_digest" ~ '^[0-9a-f]{64}$');
