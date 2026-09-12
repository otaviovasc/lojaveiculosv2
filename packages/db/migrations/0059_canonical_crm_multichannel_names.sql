-- Complete the provider-neutral CRM cutover only after the reset has removed
-- every row owned by the superseded runtime models. This deliberately rejects
-- an implicit backfill through table renames.
DO $$
DECLARE
  legacy_count bigint;
  target_table text;
BEGIN
  FOREACH target_table IN ARRAY ARRAY[
    'crm_whatsapp_quick_messages',
    'crm_whatsapp_outbound_intents',
    'crm_whatsapp_scheduled_messages',
    'crm_whatsapp_campaigns',
    'crm_whatsapp_campaign_recipients',
    'bot_integration_grants',
    'bot_action_commands',
    'provider_effects'
  ]
  LOOP
    IF to_regclass('public.' || target_table) IS NOT NULL THEN
      EXECUTE format('SELECT count(*) FROM public.%I', target_table)
        INTO legacy_count;
      IF legacy_count > 0 THEN
        RAISE EXCEPTION
          'CRM canonical multichannel cutover requires an empty % table (found % rows)',
          target_table,
          legacy_count;
      END IF;
    END IF;
  END LOOP;
END $$;--> statement-breakpoint

ALTER TYPE "provider_connection_state" RENAME TO "crm_channel_connection_state";--> statement-breakpoint
ALTER TYPE "canonical_message_direction" RENAME TO "crm_message_direction";--> statement-breakpoint
ALTER TYPE "canonical_message_status" RENAME TO "crm_message_status";--> statement-breakpoint
ALTER TYPE "canonical_message_sender" RENAME TO "crm_message_sender";--> statement-breakpoint
ALTER TYPE "canonical_message_origin" RENAME TO "crm_message_origin";--> statement-breakpoint
ALTER TYPE "crm_whatsapp_quick_message_kind" RENAME TO "crm_quick_message_kind";--> statement-breakpoint
ALTER TYPE "crm_whatsapp_outbound_intent_status" RENAME TO "crm_outbound_intent_status";--> statement-breakpoint
ALTER TYPE "crm_whatsapp_scheduled_message_status" RENAME TO "crm_scheduled_message_status";--> statement-breakpoint
ALTER TYPE "crm_whatsapp_campaign_status" RENAME TO "crm_campaign_status";--> statement-breakpoint
ALTER TYPE "crm_whatsapp_campaign_recipient_status" RENAME TO "crm_campaign_recipient_status";--> statement-breakpoint
ALTER TYPE "bot_integration_grant_state" RENAME TO "crm_external_bot_grant_state";--> statement-breakpoint
ALTER TYPE "bot_action_command_state" RENAME TO "crm_external_bot_action_command_state";--> statement-breakpoint
ALTER TYPE "bot_authorization_class" RENAME TO "crm_external_bot_authorization_class";--> statement-breakpoint
ALTER TYPE "provider_effect_state" RENAME TO "crm_external_bot_provider_effect_state";--> statement-breakpoint
ALTER TYPE "crm_bot_routing_mode" RENAME TO "crm_external_bot_route_mode";--> statement-breakpoint

ALTER TABLE "crm_channel_routing_policies"
  ALTER COLUMN "channel" TYPE "messaging_channel"
  USING "channel"::text::"messaging_channel";--> statement-breakpoint
ALTER TABLE "crm_external_bot_policies"
  ALTER COLUMN "channel" TYPE "messaging_channel"
  USING "channel"::text::"messaging_channel";--> statement-breakpoint
DROP TYPE "crm_routing_channel";--> statement-breakpoint

ALTER TABLE "crm_whatsapp_quick_messages" RENAME TO "crm_quick_messages";--> statement-breakpoint
ALTER TABLE "crm_whatsapp_outbound_intents" RENAME TO "crm_outbound_intents";--> statement-breakpoint
ALTER TABLE "crm_whatsapp_scheduled_messages" RENAME TO "crm_scheduled_messages";--> statement-breakpoint
ALTER TABLE "crm_whatsapp_campaigns" RENAME TO "crm_campaigns";--> statement-breakpoint
ALTER TABLE "crm_whatsapp_campaign_recipients" RENAME TO "crm_campaign_recipients";--> statement-breakpoint
ALTER TABLE "bot_integration_grants" RENAME TO "crm_external_bot_grants";--> statement-breakpoint
ALTER TABLE "bot_action_commands" RENAME TO "crm_external_bot_action_commands";--> statement-breakpoint
ALTER TABLE "provider_effects" RENAME TO "crm_external_bot_provider_effects";--> statement-breakpoint

-- PL/pgSQL bodies retain relation names as source text and are not rewritten by
-- ALTER TABLE. Keep the existing trigger function OID while replacing its body
-- with the canonical external-bot command table.
CREATE OR REPLACE FUNCTION "crm_core_reject_human_bot_effect"()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM "public"."crm_external_bot_action_commands" command
    WHERE command."id" = NEW."command_id" AND command."authorization_class" = 'human_approved'
  ) THEN
    RAISE EXCEPTION 'Human-approved actions cannot execute through the external bot gateway';
  END IF;
  RETURN NEW;
END;
$$;--> statement-breakpoint

ALTER TABLE "crm_scheduled_messages" RENAME COLUMN "phone" TO "recipient_address";--> statement-breakpoint
ALTER TABLE "crm_scheduled_messages" ALTER COLUMN "recipient_address" TYPE varchar(191);--> statement-breakpoint
ALTER TABLE "crm_scheduled_messages" RENAME COLUMN "text" TO "content";--> statement-breakpoint
ALTER TABLE "crm_campaign_recipients" RENAME COLUMN "phone" TO "recipient_address";--> statement-breakpoint
ALTER TABLE "crm_campaign_recipients" ALTER COLUMN "recipient_address" TYPE varchar(191);--> statement-breakpoint
ALTER TABLE "crm_channel_routing_policies" RENAME COLUMN "bot_connection_id" TO "external_bot_connection_id";--> statement-breakpoint
ALTER TABLE "crm_channel_routing_policies" RENAME COLUMN "bot_mode" TO "external_bot_mode";--> statement-breakpoint

-- PostgreSQL keeps constraint and index identifiers when tables and columns are
-- renamed. Rewrite every affected catalog identifier in one pass so no legacy
-- physical name survives, including foreign keys owned by other tables.
DO $$
DECLARE
  object_record record;
  renamed_identifier text;
BEGIN
  FOR object_record IN
    SELECT constraint_name, table_name
    FROM information_schema.table_constraints
    WHERE constraint_schema = 'public'
  LOOP
    renamed_identifier := object_record.constraint_name;
    renamed_identifier := replace(renamed_identifier, 'crm_whatsapp_campaign_recipients', 'crm_campaign_recipients');
    renamed_identifier := replace(renamed_identifier, 'crm_whatsapp_scheduled_messages', 'crm_scheduled_messages');
    renamed_identifier := replace(renamed_identifier, 'crm_whatsapp_outbound_intents', 'crm_outbound_intents');
    renamed_identifier := replace(renamed_identifier, 'crm_whatsapp_quick_messages', 'crm_quick_messages');
    renamed_identifier := replace(renamed_identifier, 'crm_whatsapp_campaigns', 'crm_campaigns');
    renamed_identifier := replace(renamed_identifier, 'bot_integration_grants', 'crm_external_bot_grants');
    renamed_identifier := replace(renamed_identifier, 'bot_action_commands', 'crm_external_bot_action_commands');
    renamed_identifier := replace(renamed_identifier, 'provider_effects', 'crm_external_bot_provider_effects');
    IF object_record.table_name <> 'fiscal_provider_connections' THEN
      renamed_identifier := replace(renamed_identifier, 'provider_connections', 'crm_channel_connections');
    END IF;
    renamed_identifier := replace(renamed_identifier, 'canonical_messages', 'crm_messages');
    renamed_identifier := replace(renamed_identifier, 'crm_connections', 'crm_channel_connections');
    renamed_identifier := replace(renamed_identifier, 'bot_connection', 'external_bot_connection');
    renamed_identifier := replace(renamed_identifier, 'bot_mode', 'external_bot_mode');
    renamed_identifier := regexp_replace(
      renamed_identifier,
      '_provider_connection_id_provider_connect.*$',
      '_provider_connection_id_crm_channel_connections_id_fk'
    );
    renamed_identifier := regexp_replace(
      renamed_identifier,
      '_message_id_canonical_messages.*$',
      '_message_id_crm_messages_id_fk'
    );
    renamed_identifier := regexp_replace(
      renamed_identifier,
      '_campaign_id_crm_whatsapp_campa.*$',
      '_campaign_id_crm_campaigns_id_fk'
    );

    IF renamed_identifier <> object_record.constraint_name THEN
      EXECUTE format(
        'ALTER TABLE public.%I RENAME CONSTRAINT %I TO %I',
        object_record.table_name,
        object_record.constraint_name,
        renamed_identifier
      );
    END IF;
  END LOOP;

  FOR object_record IN
    SELECT indexname, tablename
    FROM pg_indexes
    WHERE schemaname = 'public'
  LOOP
    renamed_identifier := object_record.indexname;
    renamed_identifier := replace(renamed_identifier, 'crm_whatsapp_campaign_recipients', 'crm_campaign_recipients');
    renamed_identifier := replace(renamed_identifier, 'crm_whatsapp_scheduled_messages', 'crm_scheduled_messages');
    renamed_identifier := replace(renamed_identifier, 'crm_whatsapp_outbound_intents', 'crm_outbound_intents');
    renamed_identifier := replace(renamed_identifier, 'crm_whatsapp_quick_messages', 'crm_quick_messages');
    renamed_identifier := replace(renamed_identifier, 'crm_whatsapp_campaigns', 'crm_campaigns');
    renamed_identifier := replace(renamed_identifier, 'bot_integration_grants', 'crm_external_bot_grants');
    renamed_identifier := replace(renamed_identifier, 'bot_action_commands', 'crm_external_bot_action_commands');
    renamed_identifier := replace(renamed_identifier, 'provider_effects', 'crm_external_bot_provider_effects');
    IF object_record.tablename <> 'fiscal_provider_connections' THEN
      renamed_identifier := replace(renamed_identifier, 'provider_connections', 'crm_channel_connections');
    END IF;
    renamed_identifier := replace(renamed_identifier, 'canonical_messages', 'crm_messages');
    renamed_identifier := replace(renamed_identifier, 'crm_connections', 'crm_channel_connections');
    renamed_identifier := replace(renamed_identifier, 'bot_connection', 'external_bot_connection');
    renamed_identifier := replace(renamed_identifier, 'bot_mode', 'external_bot_mode');

    IF renamed_identifier <> object_record.indexname THEN
      EXECUTE format(
        'ALTER INDEX public.%I RENAME TO %I',
        object_record.indexname,
        renamed_identifier
      );
    END IF;
  END LOOP;
END
$$;--> statement-breakpoint

-- Collapse provider-specific permission keys into the canonical permission
-- catalog. A deny wins whenever multiple old overrides converge on one key.
WITH permission_mapping(old_key, new_key) AS (
  VALUES
    ('crm.whatsapp.list', 'crm.conversations.read'),
    ('crm.whatsapp.read', 'crm.conversations.read'),
    ('crm.whatsapp.assign', 'crm.conversations.assign'),
    ('crm.whatsapp.close', 'crm.conversations.manage'),
    ('crm.whatsapp.send', 'crm.messages.send'),
    ('crm.whatsapp.ingest', 'crm.messages.ingest'),
    ('crm.whatsapp.tags.assign', 'crm.tags.assign'),
    ('crm.whatsapp.tags.manage', 'crm.tags.manage'),
    ('crm.whatsapp.toggle_intervention', 'crm.attendances.manage'),
    ('crm.whatsapp.schedules.read', 'crm.scheduled_messages.read'),
    ('crm.whatsapp.schedules.create', 'crm.scheduled_messages.create'),
    ('crm.whatsapp.schedules.cancel', 'crm.scheduled_messages.cancel'),
    ('crm.whatsapp.schedules.process', 'crm.scheduled_messages.process'),
    ('crm.whatsapp.campaigns.read', 'crm.campaigns.read'),
    ('crm.whatsapp.campaigns.manage', 'crm.campaigns.manage'),
    ('crm.whatsapp.integrations.manage', 'crm.messaging.connection.setup'),
    ('crm.whatsapp.integrations.manage', 'crm.bot.manage'),
    ('crm.whatsapp.integrations.manage', 'crm.bot.read'),
    ('crm.whatsapp.integrations.manage', 'crm.bot.proposals.decide')
), projected_role_permissions AS (
  SELECT
    min(existing."created_at") AS created_at,
    mapping.new_key AS permission_key,
    existing."role_template_id"
  FROM "role_template_permissions" AS existing
  JOIN permission_mapping AS mapping
    ON mapping.old_key = existing."permission_key"
  GROUP BY existing."role_template_id", mapping.new_key
)
INSERT INTO "role_template_permissions" (
  "created_at",
  "permission_key",
  "role_template_id",
  "updated_at"
)
SELECT created_at, permission_key, role_template_id, now()
FROM projected_role_permissions
ON CONFLICT ("role_template_id", "permission_key") DO NOTHING;--> statement-breakpoint

WITH permission_mapping(old_key, new_key) AS (
  VALUES
    ('crm.whatsapp.list', 'crm.conversations.read'),
    ('crm.whatsapp.read', 'crm.conversations.read'),
    ('crm.whatsapp.assign', 'crm.conversations.assign'),
    ('crm.whatsapp.close', 'crm.conversations.manage'),
    ('crm.whatsapp.send', 'crm.messages.send'),
    ('crm.whatsapp.ingest', 'crm.messages.ingest'),
    ('crm.whatsapp.tags.assign', 'crm.tags.assign'),
    ('crm.whatsapp.tags.manage', 'crm.tags.manage'),
    ('crm.whatsapp.toggle_intervention', 'crm.attendances.manage'),
    ('crm.whatsapp.schedules.read', 'crm.scheduled_messages.read'),
    ('crm.whatsapp.schedules.create', 'crm.scheduled_messages.create'),
    ('crm.whatsapp.schedules.cancel', 'crm.scheduled_messages.cancel'),
    ('crm.whatsapp.schedules.process', 'crm.scheduled_messages.process'),
    ('crm.whatsapp.campaigns.read', 'crm.campaigns.read'),
    ('crm.whatsapp.campaigns.manage', 'crm.campaigns.manage'),
    ('crm.whatsapp.integrations.manage', 'crm.messaging.connection.setup'),
    ('crm.whatsapp.integrations.manage', 'crm.bot.manage'),
    ('crm.whatsapp.integrations.manage', 'crm.bot.read'),
    ('crm.whatsapp.integrations.manage', 'crm.bot.proposals.decide')
), projected_overrides AS (
  SELECT
    bool_and(existing."allowed") AS allowed,
    min(existing."created_at") AS created_at,
    existing."membership_id",
    mapping.new_key AS permission_key,
    CASE
      WHEN bool_and(existing."allowed") THEN max(existing."reason")
      ELSE max(existing."reason") FILTER (WHERE existing."allowed" = false)
    END AS reason
  FROM "membership_permission_overrides" AS existing
  JOIN permission_mapping AS mapping
    ON mapping.old_key = existing."permission_key"
  GROUP BY existing."membership_id", mapping.new_key
)
INSERT INTO "membership_permission_overrides" (
  "allowed",
  "created_at",
  "membership_id",
  "permission_key",
  "reason",
  "updated_at"
)
SELECT allowed, created_at, membership_id, permission_key, reason, now()
FROM projected_overrides
ON CONFLICT ("membership_id", "permission_key") DO UPDATE SET
  "allowed" = "membership_permission_overrides"."allowed" AND EXCLUDED."allowed",
  "reason" = CASE
    WHEN EXCLUDED."allowed" = false THEN EXCLUDED."reason"
    ELSE "membership_permission_overrides"."reason"
  END,
  "updated_at" = now();--> statement-breakpoint

DELETE FROM "membership_permission_overrides"
WHERE "permission_key" IN (
  'crm.whatsapp.list',
  'crm.whatsapp.read',
  'crm.whatsapp.assign',
  'crm.whatsapp.close',
  'crm.whatsapp.send',
  'crm.whatsapp.ingest',
  'crm.whatsapp.tags.assign',
  'crm.whatsapp.tags.manage',
  'crm.whatsapp.toggle_intervention',
  'crm.whatsapp.schedules.read',
  'crm.whatsapp.schedules.create',
  'crm.whatsapp.schedules.cancel',
  'crm.whatsapp.schedules.process',
  'crm.whatsapp.campaigns.read',
  'crm.whatsapp.campaigns.manage',
  'crm.whatsapp.integrations.manage'
);--> statement-breakpoint

DELETE FROM "role_template_permissions"
WHERE "permission_key" IN (
  'crm.whatsapp.list',
  'crm.whatsapp.read',
  'crm.whatsapp.assign',
  'crm.whatsapp.close',
  'crm.whatsapp.send',
  'crm.whatsapp.ingest',
  'crm.whatsapp.tags.assign',
  'crm.whatsapp.tags.manage',
  'crm.whatsapp.toggle_intervention',
  'crm.whatsapp.schedules.read',
  'crm.whatsapp.schedules.create',
  'crm.whatsapp.schedules.cancel',
  'crm.whatsapp.schedules.process',
  'crm.whatsapp.campaigns.read',
  'crm.whatsapp.campaigns.manage',
  'crm.whatsapp.integrations.manage'
);
