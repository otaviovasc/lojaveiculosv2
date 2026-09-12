CREATE TYPE "public"."billing_provider_reconciliation_kind" AS ENUM('catalog_migration', 'zapi_cancellation');--> statement-breakpoint
CREATE TYPE "public"."billing_provider_reconciliation_status" AS ENUM('queued', 'processing', 'retry', 'succeeded');--> statement-breakpoint
CREATE TYPE "public"."crm_whatsapp_outbound_intent_status" AS ENUM('started', 'provider_succeeded', 'completed', 'indeterminate');--> statement-breakpoint
CREATE TABLE "billing_provider_reconciliations" (
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"attempt_count" integer DEFAULT 0 NOT NULL,
	"available_at" timestamp with time zone DEFAULT now() NOT NULL,
	"completed_at" timestamp with time zone,
	"kind" "billing_provider_reconciliation_kind" NOT NULL,
	"last_error" text,
	"processing_started_at" timestamp with time zone,
	"processing_token" uuid,
	"status" "billing_provider_reconciliation_status" DEFAULT 'queued' NOT NULL,
	"subscription_id" uuid NOT NULL,
	"tenant_id" uuid NOT NULL
);
--> statement-breakpoint
CREATE TABLE "crm_whatsapp_outbound_intents" (
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"claim_token" uuid NOT NULL,
	"connection_id" uuid NOT NULL,
	"fingerprint" varchar(64) NOT NULL,
	"idempotency_key" varchar(191) NOT NULL,
	"message_id" uuid,
	"provider_result" jsonb,
	"session_id" uuid,
	"started_at" timestamp with time zone NOT NULL,
	"status" "crm_whatsapp_outbound_intent_status" DEFAULT 'started' NOT NULL,
	"store_id" uuid NOT NULL,
	"tenant_id" uuid NOT NULL
);
--> statement-breakpoint
ALTER TABLE "billing_provider_reconciliations" ADD CONSTRAINT "billing_provider_reconciliations_subscription_id_subscriptions_id_fk" FOREIGN KEY ("subscription_id") REFERENCES "public"."subscriptions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "billing_provider_reconciliations" ADD CONSTRAINT "billing_provider_reconciliations_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "billing_provider_reconciliations" ADD CONSTRAINT "billing_provider_reconciliations_subscription_tenant_fk" FOREIGN KEY ("subscription_id","tenant_id") REFERENCES "public"."subscriptions"("id","tenant_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crm_whatsapp_outbound_intents" ADD CONSTRAINT "crm_whatsapp_outbound_intents_connection_id_crm_connections_id_fk" FOREIGN KEY ("connection_id") REFERENCES "public"."crm_connections"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crm_whatsapp_outbound_intents" ADD CONSTRAINT "crm_whatsapp_outbound_intents_message_id_crm_whatsapp_messages_id_fk" FOREIGN KEY ("message_id") REFERENCES "public"."crm_whatsapp_messages"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crm_whatsapp_outbound_intents" ADD CONSTRAINT "crm_whatsapp_outbound_intents_session_id_crm_whatsapp_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."crm_whatsapp_sessions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crm_whatsapp_outbound_intents" ADD CONSTRAINT "crm_whatsapp_outbound_intents_store_id_stores_id_fk" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crm_whatsapp_outbound_intents" ADD CONSTRAINT "crm_whatsapp_outbound_intents_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "billing_provider_reconciliations_claim_idx" ON "billing_provider_reconciliations" USING btree ("status","available_at","processing_started_at");--> statement-breakpoint
CREATE UNIQUE INDEX "billing_provider_reconciliations_kind_subscription_unique" ON "billing_provider_reconciliations" USING btree ("kind","subscription_id");--> statement-breakpoint
CREATE UNIQUE INDEX "crm_whatsapp_outbound_intents_scope_key_unique" ON "crm_whatsapp_outbound_intents" USING btree ("tenant_id","store_id","idempotency_key");--> statement-breakpoint
CREATE INDEX "crm_whatsapp_outbound_intents_recovery_idx" ON "crm_whatsapp_outbound_intents" USING btree ("status","started_at");--> statement-breakpoint
INSERT INTO "billing_provider_reconciliations" (
	"kind", "subscription_id", "tenant_id"
)
SELECT DISTINCT
	'catalog_migration'::"public"."billing_provider_reconciliation_kind",
	subscription."id",
	subscription."tenant_id"
FROM "subscription_items" item
JOIN "addons" addon ON addon."id" = item."addon_id"
JOIN "subscriptions" subscription ON subscription."id" = item."subscription_id"
WHERE addon."code" = 'crm_core'
	AND addon."catalog_version" = '2026-08-v1'
	AND subscription."status" = 'active'
	AND subscription."provider" = 'asaas'
	AND subscription."provider_subscription_id" IS NOT NULL
	AND (item."ends_at" IS NULL OR item."ends_at" > now())
ON CONFLICT ("kind", "subscription_id") DO NOTHING;
