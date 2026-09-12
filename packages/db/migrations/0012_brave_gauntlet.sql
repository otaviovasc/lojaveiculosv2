DROP INDEX "crm_whatsapp_sessions_connection_phone_unique";--> statement-breakpoint
UPDATE "leads"
SET "buyer_phone" = NULL
FROM "crm_whatsapp_sessions"
WHERE "crm_whatsapp_sessions"."lead_id" = "leads"."id"
  AND "crm_whatsapp_sessions"."channel"::text = 'INSTAGRAM'
  AND "leads"."buyer_phone" = "crm_whatsapp_sessions"."channel_external_id";--> statement-breakpoint
UPDATE "crm_whatsapp_sessions"
SET "buyer_phone" = ''
WHERE "channel"::text = 'INSTAGRAM';--> statement-breakpoint
CREATE UNIQUE INDEX "crm_whatsapp_sessions_connection_channel_external_unique" ON "crm_whatsapp_sessions" USING btree ("connection_id","channel_external_id") WHERE "crm_whatsapp_sessions"."channel_external_id" IS NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "crm_whatsapp_sessions_connection_phone_unique" ON "crm_whatsapp_sessions" USING btree ("connection_id","buyer_phone") WHERE "crm_whatsapp_sessions"."buyer_phone" <> '';
