ALTER TYPE "public"."crm_webhook_effect_status" ADD VALUE 'dead_letter';--> statement-breakpoint
ALTER TABLE "crm_webhook_effect_outbox" ADD COLUMN "dead_lettered_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "crm_webhook_effect_outbox" ADD COLUMN "next_attempt_at" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
UPDATE "provider_events" AS "event"
SET "store_id" = "connection"."store_id",
    "tenant_id" = "connection"."tenant_id"
FROM "crm_connections" AS "connection"
WHERE "event"."connection_id" = "connection"."id"
  AND ("event"."store_id" IS DISTINCT FROM "connection"."store_id"
    OR "event"."tenant_id" IS DISTINCT FROM "connection"."tenant_id");--> statement-breakpoint
ALTER TABLE "provider_events" ADD CONSTRAINT "provider_events_scope_complete_check" CHECK (("store_id" IS NULL AND "tenant_id" IS NULL) OR ("store_id" IS NOT NULL AND "tenant_id" IS NOT NULL));--> statement-breakpoint
ALTER TABLE "provider_events" ADD CONSTRAINT "provider_events_connection_scope_check" CHECK ("connection_id" IS NULL OR ("store_id" IS NOT NULL AND "tenant_id" IS NOT NULL));--> statement-breakpoint
ALTER TABLE "provider_events" ADD CONSTRAINT "provider_events_store_tenant_fk" FOREIGN KEY ("store_id","tenant_id") REFERENCES "public"."stores"("id","tenant_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "provider_events" ADD CONSTRAINT "provider_events_scoped_connection_fk" FOREIGN KEY ("tenant_id","store_id","connection_id") REFERENCES "public"."crm_connections"("tenant_id","store_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "provider_events_scope_id_unique" ON "provider_events" USING btree ("tenant_id","store_id","connection_id","id");--> statement-breakpoint
ALTER TABLE "crm_webhook_effect_outbox" ADD CONSTRAINT "crm_webhook_effect_outbox_scoped_provider_event_fk" FOREIGN KEY ("tenant_id","store_id","connection_id","provider_event_id") REFERENCES "public"."provider_events"("tenant_id","store_id","connection_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
DROP INDEX "crm_webhook_effect_outbox_pending_idx";--> statement-breakpoint
CREATE INDEX "crm_webhook_effect_outbox_pending_idx" ON "crm_webhook_effect_outbox" USING btree ("status","next_attempt_at","processing_started_at");
