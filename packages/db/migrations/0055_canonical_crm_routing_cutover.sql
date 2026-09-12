DO $$
DECLARE
  legacy_count bigint;
BEGIN
  IF to_regclass('public.crm_connections') IS NOT NULL THEN
    EXECUTE 'SELECT count(*) FROM public.crm_connections' INTO legacy_count;
    IF legacy_count > 0 THEN
      RAISE EXCEPTION 'CRM canonical cutover requires an empty crm_connections table (found % rows)', legacy_count;
    END IF;
  END IF;

  IF to_regclass('public.crm_whatsapp_sessions') IS NOT NULL THEN
    EXECUTE 'SELECT count(*) FROM public.crm_whatsapp_sessions' INTO legacy_count;
    IF legacy_count > 0 THEN
      RAISE EXCEPTION 'CRM canonical cutover requires an empty crm_whatsapp_sessions table (found % rows)', legacy_count;
    END IF;
  END IF;

  IF to_regclass('public.crm_whatsapp_messages') IS NOT NULL THEN
    EXECUTE 'SELECT count(*) FROM public.crm_whatsapp_messages' INTO legacy_count;
    IF legacy_count > 0 THEN
      RAISE EXCEPTION 'CRM canonical cutover requires an empty crm_whatsapp_messages table (found % rows)', legacy_count;
    END IF;
  END IF;
END $$;--> statement-breakpoint

ALTER TABLE IF EXISTS "provider_connections" RENAME TO "crm_channel_connections";--> statement-breakpoint
ALTER TABLE IF EXISTS "conversation_threads" RENAME TO "crm_conversation_threads";--> statement-breakpoint
ALTER TABLE IF EXISTS "conversation_cycles" RENAME TO "crm_conversation_cycles";--> statement-breakpoint
ALTER TABLE IF EXISTS "conversation_attendances" RENAME TO "crm_conversation_attendances";--> statement-breakpoint
ALTER TABLE IF EXISTS "canonical_messages" RENAME TO "crm_messages";--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "crm_external_bot_policies" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  "action_type" varchar(120) NOT NULL,
  "channel" "crm_routing_channel" NOT NULL,
  "connection_rate_per_minute" integer DEFAULT 30 NOT NULL,
  "cooldown_seconds" integer DEFAULT 30 NOT NULL,
  "daily_limit" integer DEFAULT 500 NOT NULL,
  "mode" varchar(16) DEFAULT 'disabled' NOT NULL,
  "store_id" uuid NOT NULL,
  "tenant_id" uuid NOT NULL,
  CONSTRAINT "crm_external_bot_policies_mode_check" CHECK ("crm_external_bot_policies"."mode" IN ('auto','proposal','disabled')),
  CONSTRAINT "crm_external_bot_policies_limits_check" CHECK ("crm_external_bot_policies"."cooldown_seconds" >= 0 AND "crm_external_bot_policies"."connection_rate_per_minute" >= 0 AND "crm_external_bot_policies"."daily_limit" >= 0),
  CONSTRAINT "crm_external_bot_policies_store_id_stores_id_fk" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id") ON DELETE no action ON UPDATE no action,
  CONSTRAINT "crm_external_bot_policies_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action,
  CONSTRAINT "crm_external_bot_policies_scope_fk" FOREIGN KEY ("store_id","tenant_id") REFERENCES "public"."stores"("id","tenant_id") ON DELETE no action ON UPDATE no action
);--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "crm_external_bot_policies_action_unique" ON "crm_external_bot_policies" USING btree ("tenant_id","store_id","channel","action_type");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "crm_external_bot_policies_channel_idx" ON "crm_external_bot_policies" USING btree ("tenant_id","store_id","channel");--> statement-breakpoint
