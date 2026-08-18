DO $$
DECLARE
  invalid_count bigint;
  expected record;
  target record;
BEGIN
  IF to_regclass('public.crm_connections') IS NULL THEN
    RAISE EXCEPTION 'CRM connection FK canonicalization requires legacy table crm_connections';
  END IF;

  IF to_regclass('public.crm_channel_connections') IS NULL THEN
    RAISE EXCEPTION 'CRM connection FK canonicalization requires canonical table crm_channel_connections';
  END IF;

  FOR expected IN
    SELECT *
    FROM (VALUES
      ('crm_whatsapp_sessions', 'crm_whatsapp_sessions_connection_id_crm_connections_id_fk'),
      ('crm_whatsapp_sessions', 'crm_whatsapp_sessions_scoped_connection_fk'),
      ('crm_whatsapp_messages', 'crm_whatsapp_messages_connection_id_crm_connections_id_fk'),
      ('provider_events', 'provider_events_scoped_connection_fk'),
      ('crm_webhook_effect_outbox', 'crm_webhook_effect_outbox_connection_id_crm_connections_id_fk'),
      ('crm_webhook_effect_outbox', 'crm_webhook_effect_outbox_scoped_connection_fk'),
      ('crm_whatsapp_scheduled_messages', 'crm_whatsapp_scheduled_messages_connection_id_crm_connections_i'),
      ('crm_whatsapp_outbound_intents', 'crm_whatsapp_outbound_intents_connection_id_crm_connections_id_'),
      ('crm_whatsapp_outbound_intents', 'crm_whatsapp_outbound_intents_scoped_connection_fk'),
      ('crm_whatsapp_campaigns', 'crm_whatsapp_campaigns_selected_connection_id_crm_connections_i'),
      ('crm_whatsapp_campaign_recipients', 'crm_whatsapp_campaign_recipients_connection_id_crm_connections_'),
      ('crm_tags', 'crm_tags_connection_id_crm_connections_id_fk'),
      ('crm_whatsapp_intervention_ledger', 'crm_whatsapp_intervention_ledger_scoped_connection_fk')
    ) AS expected_constraints(table_name, constraint_name)
  LOOP
    SELECT count(*)
    INTO invalid_count
    FROM pg_constraint
    WHERE conname = expected.constraint_name
      AND conrelid = to_regclass('public.' || expected.table_name)
      AND confrelid = to_regclass('public.crm_connections');

    IF invalid_count <> 1 THEN
      RAISE EXCEPTION 'Expected legacy constraint %.% referencing crm_connections', expected.table_name, expected.constraint_name;
    END IF;
  END LOOP;

  FOR target IN
    SELECT *
    FROM (VALUES
      ('crm_whatsapp_sessions', 'connection_id'),
      ('crm_whatsapp_messages', 'connection_id'),
      ('provider_events', 'connection_id'),
      ('crm_webhook_effect_outbox', 'connection_id'),
      ('crm_whatsapp_scheduled_messages', 'connection_id'),
      ('crm_whatsapp_outbound_intents', 'connection_id'),
      ('crm_whatsapp_campaigns', 'selected_connection_id'),
      ('crm_whatsapp_campaign_recipients', 'connection_id'),
      ('crm_tags', 'connection_id'),
      ('crm_whatsapp_intervention_ledger', 'connection_id')
    ) AS target_tables(table_name, column_name)
  LOOP
    EXECUTE format(
      'SELECT count(*) FROM public.%I AS child LEFT JOIN public.crm_channel_connections AS connection ON connection.id = child.%I AND connection.tenant_id = child.tenant_id AND connection.store_id = child.store_id WHERE child.%I IS NOT NULL AND connection.id IS NULL',
      target.table_name,
      target.column_name,
      target.column_name
    ) INTO invalid_count;

    IF invalid_count > 0 THEN
      RAISE EXCEPTION 'CRM connection FK canonicalization found % orphaned or cross-scope rows in %', invalid_count, target.table_name;
    END IF;
  END LOOP;
END $$;--> statement-breakpoint

ALTER TABLE "crm_whatsapp_sessions" DROP CONSTRAINT "crm_whatsapp_sessions_connection_id_crm_connections_id_fk";--> statement-breakpoint
ALTER TABLE "crm_whatsapp_sessions" DROP CONSTRAINT "crm_whatsapp_sessions_scoped_connection_fk";--> statement-breakpoint
ALTER TABLE "crm_whatsapp_messages" DROP CONSTRAINT "crm_whatsapp_messages_connection_id_crm_connections_id_fk";--> statement-breakpoint
ALTER TABLE "provider_events" DROP CONSTRAINT "provider_events_scoped_connection_fk";--> statement-breakpoint
ALTER TABLE "crm_webhook_effect_outbox" DROP CONSTRAINT "crm_webhook_effect_outbox_connection_id_crm_connections_id_fk";--> statement-breakpoint
ALTER TABLE "crm_webhook_effect_outbox" DROP CONSTRAINT "crm_webhook_effect_outbox_scoped_connection_fk";--> statement-breakpoint
ALTER TABLE "crm_whatsapp_scheduled_messages" DROP CONSTRAINT "crm_whatsapp_scheduled_messages_connection_id_crm_connections_i";--> statement-breakpoint
ALTER TABLE "crm_whatsapp_outbound_intents" DROP CONSTRAINT "crm_whatsapp_outbound_intents_connection_id_crm_connections_id_";--> statement-breakpoint
ALTER TABLE "crm_whatsapp_outbound_intents" DROP CONSTRAINT "crm_whatsapp_outbound_intents_scoped_connection_fk";--> statement-breakpoint
ALTER TABLE "crm_whatsapp_campaigns" DROP CONSTRAINT "crm_whatsapp_campaigns_selected_connection_id_crm_connections_i";--> statement-breakpoint
ALTER TABLE "crm_whatsapp_campaign_recipients" DROP CONSTRAINT "crm_whatsapp_campaign_recipients_connection_id_crm_connections_";--> statement-breakpoint
ALTER TABLE "crm_tags" DROP CONSTRAINT "crm_tags_connection_id_crm_connections_id_fk";--> statement-breakpoint
ALTER TABLE "crm_whatsapp_intervention_ledger" DROP CONSTRAINT "crm_whatsapp_intervention_ledger_scoped_connection_fk";--> statement-breakpoint

ALTER TABLE "crm_whatsapp_sessions" ADD CONSTRAINT "crm_whatsapp_sessions_connection_fk" FOREIGN KEY ("connection_id") REFERENCES "public"."crm_channel_connections"("id") ON DELETE no action ON UPDATE no action NOT VALID;--> statement-breakpoint
ALTER TABLE "crm_whatsapp_sessions" ADD CONSTRAINT "crm_whatsapp_sessions_scoped_connection_fk" FOREIGN KEY ("tenant_id","store_id","connection_id") REFERENCES "public"."crm_channel_connections"("tenant_id","store_id","id") ON DELETE no action ON UPDATE no action NOT VALID;--> statement-breakpoint
ALTER TABLE "crm_whatsapp_messages" ADD CONSTRAINT "crm_whatsapp_messages_connection_fk" FOREIGN KEY ("connection_id") REFERENCES "public"."crm_channel_connections"("id") ON DELETE no action ON UPDATE no action NOT VALID;--> statement-breakpoint
ALTER TABLE "crm_whatsapp_messages" ADD CONSTRAINT "crm_whatsapp_messages_scoped_connection_fk" FOREIGN KEY ("tenant_id","store_id","connection_id") REFERENCES "public"."crm_channel_connections"("tenant_id","store_id","id") ON DELETE no action ON UPDATE no action NOT VALID;--> statement-breakpoint
ALTER TABLE "provider_events" ADD CONSTRAINT "provider_events_scoped_connection_fk" FOREIGN KEY ("tenant_id","store_id","connection_id") REFERENCES "public"."crm_channel_connections"("tenant_id","store_id","id") ON DELETE no action ON UPDATE no action NOT VALID;--> statement-breakpoint
ALTER TABLE "crm_webhook_effect_outbox" ADD CONSTRAINT "crm_webhook_effect_outbox_connection_fk" FOREIGN KEY ("connection_id") REFERENCES "public"."crm_channel_connections"("id") ON DELETE no action ON UPDATE no action NOT VALID;--> statement-breakpoint
ALTER TABLE "crm_webhook_effect_outbox" ADD CONSTRAINT "crm_webhook_effect_outbox_scoped_connection_fk" FOREIGN KEY ("tenant_id","store_id","connection_id") REFERENCES "public"."crm_channel_connections"("tenant_id","store_id","id") ON DELETE no action ON UPDATE no action NOT VALID;--> statement-breakpoint
ALTER TABLE "crm_whatsapp_scheduled_messages" ADD CONSTRAINT "crm_whatsapp_scheduled_messages_connection_fk" FOREIGN KEY ("connection_id") REFERENCES "public"."crm_channel_connections"("id") ON DELETE no action ON UPDATE no action NOT VALID;--> statement-breakpoint
ALTER TABLE "crm_whatsapp_scheduled_messages" ADD CONSTRAINT "crm_whatsapp_scheduled_messages_scoped_connection_fk" FOREIGN KEY ("tenant_id","store_id","connection_id") REFERENCES "public"."crm_channel_connections"("tenant_id","store_id","id") ON DELETE no action ON UPDATE no action NOT VALID;--> statement-breakpoint
ALTER TABLE "crm_whatsapp_outbound_intents" ADD CONSTRAINT "crm_whatsapp_outbound_intents_connection_fk" FOREIGN KEY ("connection_id") REFERENCES "public"."crm_channel_connections"("id") ON DELETE no action ON UPDATE no action NOT VALID;--> statement-breakpoint
ALTER TABLE "crm_whatsapp_outbound_intents" ADD CONSTRAINT "crm_whatsapp_outbound_intents_scoped_connection_fk" FOREIGN KEY ("tenant_id","store_id","connection_id") REFERENCES "public"."crm_channel_connections"("tenant_id","store_id","id") ON DELETE no action ON UPDATE no action NOT VALID;--> statement-breakpoint
ALTER TABLE "crm_whatsapp_campaigns" ADD CONSTRAINT "crm_whatsapp_campaigns_selected_connection_fk" FOREIGN KEY ("selected_connection_id") REFERENCES "public"."crm_channel_connections"("id") ON DELETE no action ON UPDATE no action NOT VALID;--> statement-breakpoint
ALTER TABLE "crm_whatsapp_campaigns" ADD CONSTRAINT "crm_whatsapp_campaigns_scoped_connection_fk" FOREIGN KEY ("tenant_id","store_id","selected_connection_id") REFERENCES "public"."crm_channel_connections"("tenant_id","store_id","id") ON DELETE no action ON UPDATE no action NOT VALID;--> statement-breakpoint
ALTER TABLE "crm_whatsapp_campaign_recipients" ADD CONSTRAINT "crm_whatsapp_campaign_recipients_connection_fk" FOREIGN KEY ("connection_id") REFERENCES "public"."crm_channel_connections"("id") ON DELETE no action ON UPDATE no action NOT VALID;--> statement-breakpoint
ALTER TABLE "crm_whatsapp_campaign_recipients" ADD CONSTRAINT "crm_whatsapp_campaign_recipients_scoped_connection_fk" FOREIGN KEY ("tenant_id","store_id","connection_id") REFERENCES "public"."crm_channel_connections"("tenant_id","store_id","id") ON DELETE no action ON UPDATE no action NOT VALID;--> statement-breakpoint
ALTER TABLE "crm_tags" ADD CONSTRAINT "crm_tags_connection_fk" FOREIGN KEY ("connection_id") REFERENCES "public"."crm_channel_connections"("id") ON DELETE no action ON UPDATE no action NOT VALID;--> statement-breakpoint
ALTER TABLE "crm_tags" ADD CONSTRAINT "crm_tags_scoped_connection_fk" FOREIGN KEY ("tenant_id","store_id","connection_id") REFERENCES "public"."crm_channel_connections"("tenant_id","store_id","id") ON DELETE no action ON UPDATE no action NOT VALID;--> statement-breakpoint
ALTER TABLE "crm_whatsapp_intervention_ledger" ADD CONSTRAINT "crm_whatsapp_intervention_ledger_scoped_connection_fk" FOREIGN KEY ("tenant_id","store_id","connection_id") REFERENCES "public"."crm_channel_connections"("tenant_id","store_id","id") ON DELETE no action ON UPDATE no action NOT VALID;--> statement-breakpoint

ALTER TABLE "crm_whatsapp_sessions" VALIDATE CONSTRAINT "crm_whatsapp_sessions_connection_fk";--> statement-breakpoint
ALTER TABLE "crm_whatsapp_sessions" VALIDATE CONSTRAINT "crm_whatsapp_sessions_scoped_connection_fk";--> statement-breakpoint
ALTER TABLE "crm_whatsapp_messages" VALIDATE CONSTRAINT "crm_whatsapp_messages_connection_fk";--> statement-breakpoint
ALTER TABLE "crm_whatsapp_messages" VALIDATE CONSTRAINT "crm_whatsapp_messages_scoped_connection_fk";--> statement-breakpoint
ALTER TABLE "provider_events" VALIDATE CONSTRAINT "provider_events_scoped_connection_fk";--> statement-breakpoint
ALTER TABLE "crm_webhook_effect_outbox" VALIDATE CONSTRAINT "crm_webhook_effect_outbox_connection_fk";--> statement-breakpoint
ALTER TABLE "crm_webhook_effect_outbox" VALIDATE CONSTRAINT "crm_webhook_effect_outbox_scoped_connection_fk";--> statement-breakpoint
ALTER TABLE "crm_whatsapp_scheduled_messages" VALIDATE CONSTRAINT "crm_whatsapp_scheduled_messages_connection_fk";--> statement-breakpoint
ALTER TABLE "crm_whatsapp_scheduled_messages" VALIDATE CONSTRAINT "crm_whatsapp_scheduled_messages_scoped_connection_fk";--> statement-breakpoint
ALTER TABLE "crm_whatsapp_outbound_intents" VALIDATE CONSTRAINT "crm_whatsapp_outbound_intents_connection_fk";--> statement-breakpoint
ALTER TABLE "crm_whatsapp_outbound_intents" VALIDATE CONSTRAINT "crm_whatsapp_outbound_intents_scoped_connection_fk";--> statement-breakpoint
ALTER TABLE "crm_whatsapp_campaigns" VALIDATE CONSTRAINT "crm_whatsapp_campaigns_selected_connection_fk";--> statement-breakpoint
ALTER TABLE "crm_whatsapp_campaigns" VALIDATE CONSTRAINT "crm_whatsapp_campaigns_scoped_connection_fk";--> statement-breakpoint
ALTER TABLE "crm_whatsapp_campaign_recipients" VALIDATE CONSTRAINT "crm_whatsapp_campaign_recipients_connection_fk";--> statement-breakpoint
ALTER TABLE "crm_whatsapp_campaign_recipients" VALIDATE CONSTRAINT "crm_whatsapp_campaign_recipients_scoped_connection_fk";--> statement-breakpoint
ALTER TABLE "crm_tags" VALIDATE CONSTRAINT "crm_tags_connection_fk";--> statement-breakpoint
ALTER TABLE "crm_tags" VALIDATE CONSTRAINT "crm_tags_scoped_connection_fk";--> statement-breakpoint
ALTER TABLE "crm_whatsapp_intervention_ledger" VALIDATE CONSTRAINT "crm_whatsapp_intervention_ledger_scoped_connection_fk";
