CREATE TYPE "public"."crm_webhook_effect_status" AS ENUM('pending', 'processing', 'failed', 'delivered');--> statement-breakpoint
CREATE TYPE "public"."crm_webhook_effect_type" AS ENUM('audit_accepted', 'bot_message', 'realtime_message', 'realtime_session');--> statement-breakpoint
CREATE TABLE "crm_webhook_effect_outbox" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"connection_id" uuid NOT NULL,
	"delivered_at" timestamp with time zone,
	"effect_type" "crm_webhook_effect_type" NOT NULL,
	"last_error_code" varchar(120),
	"message_id" uuid NOT NULL,
	"processing_attempts" integer DEFAULT 0 NOT NULL,
	"processing_started_at" timestamp with time zone,
	"processing_token" uuid,
	"provider_event_id" uuid NOT NULL,
	"sequence" integer NOT NULL,
	"session_id" uuid NOT NULL,
	"status" "crm_webhook_effect_status" DEFAULT 'pending' NOT NULL,
	"store_id" uuid NOT NULL,
	"tenant_id" uuid NOT NULL
);--> statement-breakpoint
ALTER TABLE "crm_webhook_effect_outbox" ADD CONSTRAINT "crm_webhook_effect_outbox_connection_id_crm_connections_id_fk" FOREIGN KEY ("connection_id") REFERENCES "public"."crm_connections"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crm_webhook_effect_outbox" ADD CONSTRAINT "crm_webhook_effect_outbox_message_id_crm_whatsapp_messages_id_fk" FOREIGN KEY ("message_id") REFERENCES "public"."crm_whatsapp_messages"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crm_webhook_effect_outbox" ADD CONSTRAINT "crm_webhook_effect_outbox_provider_event_id_provider_events_id_fk" FOREIGN KEY ("provider_event_id") REFERENCES "public"."provider_events"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crm_webhook_effect_outbox" ADD CONSTRAINT "crm_webhook_effect_outbox_session_id_crm_whatsapp_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."crm_whatsapp_sessions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crm_webhook_effect_outbox" ADD CONSTRAINT "crm_webhook_effect_outbox_store_id_stores_id_fk" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crm_webhook_effect_outbox" ADD CONSTRAINT "crm_webhook_effect_outbox_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crm_webhook_effect_outbox" ADD CONSTRAINT "crm_webhook_effect_outbox_scoped_connection_fk" FOREIGN KEY ("tenant_id","store_id","connection_id") REFERENCES "public"."crm_connections"("tenant_id","store_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crm_webhook_effect_outbox" ADD CONSTRAINT "crm_webhook_effect_outbox_scoped_session_fk" FOREIGN KEY ("tenant_id","store_id","connection_id","session_id") REFERENCES "public"."crm_whatsapp_sessions"("tenant_id","store_id","connection_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crm_webhook_effect_outbox" ADD CONSTRAINT "crm_webhook_effect_outbox_scoped_message_fk" FOREIGN KEY ("tenant_id","store_id","connection_id","session_id","message_id") REFERENCES "public"."crm_whatsapp_messages"("tenant_id","store_id","connection_id","session_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
DROP INDEX "provider_events_provider_event_unique";--> statement-breakpoint
CREATE UNIQUE INDEX "provider_events_provider_connection_event_unique" ON "provider_events" USING btree ("provider","environment","connection_id","provider_event_id") WHERE "provider_events"."connection_id" IS NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "provider_events_provider_unscoped_event_unique" ON "provider_events" USING btree ("provider","environment","provider_event_id") WHERE "provider_events"."connection_id" IS NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "crm_webhook_effect_outbox_event_type_unique" ON "crm_webhook_effect_outbox" USING btree ("provider_event_id","effect_type");--> statement-breakpoint
CREATE INDEX "crm_webhook_effect_outbox_pending_idx" ON "crm_webhook_effect_outbox" USING btree ("status","processing_started_at");--> statement-breakpoint
CREATE INDEX "crm_webhook_effect_outbox_event_sequence_idx" ON "crm_webhook_effect_outbox" USING btree ("provider_event_id","sequence");
