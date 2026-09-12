DO $$
DECLARE
  legacy_count bigint;
  target_table text;
BEGIN
  FOREACH target_table IN ARRAY ARRAY[
    'crm_connections',
    'crm_whatsapp_sessions',
    'crm_whatsapp_messages',
    'crm_whatsapp_session_tags',
    'crm_whatsapp_session_command_receipts',
    'crm_whatsapp_intervention_ledger',
    'crm_webhook_effect_outbox',
    'crm_whatsapp_outbound_intents',
    'crm_whatsapp_scheduled_messages',
    'crm_whatsapp_campaign_recipients',
    'crm_lead_outcomes'
  ]
  LOOP
    IF to_regclass('public.' || target_table) IS NOT NULL THEN
      EXECUTE format('SELECT count(*) FROM public.%I', target_table)
        INTO legacy_count;
      IF legacy_count > 0 THEN
        RAISE EXCEPTION
          'CRM canonical operational cutover requires an empty % table (found % rows)',
          target_table,
          legacy_count;
      END IF;
    END IF;
  END LOOP;
END $$;--> statement-breakpoint

-- Assignment targets must be exact, active store members backed by a live user.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM (
      SELECT "tenant_id", "store_id", "assigned_user_id" AS user_id FROM "leads"
      UNION ALL SELECT "tenant_id", "store_id", "assigned_user_id" FROM "opportunities"
      UNION ALL SELECT "tenant_id", "store_id", "assigned_user_id" FROM "crm_conversation_cycles"
      UNION ALL SELECT "tenant_id", "store_id", "assigned_user_id" FROM "crm_conversation_attendances"
    ) assignment
    WHERE assignment.user_id IS NOT NULL
      AND NOT EXISTS (
        SELECT 1
        FROM "store_memberships" membership
        INNER JOIN "users" assignee ON assignee."id" = membership."user_id"
        WHERE membership."tenant_id" = assignment."tenant_id"
          AND membership."store_id" = assignment."store_id"
          AND membership."user_id" = assignment.user_id
          AND membership."status" = 'active'
          AND assignee."is_deleted" = false
      )
  ) THEN
    RAISE EXCEPTION 'CRM assignment integrity blocked: assignee is unavailable for the exact tenant/store';
  END IF;
END
$$;--> statement-breakpoint

CREATE UNIQUE INDEX "store_memberships_tenant_store_user_unique"
  ON "store_memberships" ("tenant_id", "store_id", "user_id");--> statement-breakpoint
ALTER TABLE "store_memberships"
  ADD CONSTRAINT "store_memberships_store_tenant_fk"
  FOREIGN KEY ("store_id", "tenant_id")
  REFERENCES "public"."stores"("id", "tenant_id") NOT VALID;--> statement-breakpoint
ALTER TABLE "store_memberships"
  VALIDATE CONSTRAINT "store_memberships_store_tenant_fk";--> statement-breakpoint

ALTER TABLE "leads"
  ADD CONSTRAINT "leads_scoped_assignee_membership_fk"
  FOREIGN KEY ("tenant_id", "store_id", "assigned_user_id")
  REFERENCES "public"."store_memberships"("tenant_id", "store_id", "user_id") NOT VALID;--> statement-breakpoint
ALTER TABLE "leads"
  VALIDATE CONSTRAINT "leads_scoped_assignee_membership_fk";--> statement-breakpoint
ALTER TABLE "opportunities"
  ADD CONSTRAINT "opportunities_scoped_assignee_membership_fk"
  FOREIGN KEY ("tenant_id", "store_id", "assigned_user_id")
  REFERENCES "public"."store_memberships"("tenant_id", "store_id", "user_id") NOT VALID;--> statement-breakpoint
ALTER TABLE "opportunities"
  VALIDATE CONSTRAINT "opportunities_scoped_assignee_membership_fk";--> statement-breakpoint
ALTER TABLE "crm_conversation_cycles"
  ADD CONSTRAINT "conversation_cycles_scoped_assignee_membership_fk"
  FOREIGN KEY ("tenant_id", "store_id", "assigned_user_id")
  REFERENCES "public"."store_memberships"("tenant_id", "store_id", "user_id") NOT VALID;--> statement-breakpoint
ALTER TABLE "crm_conversation_cycles"
  VALIDATE CONSTRAINT "conversation_cycles_scoped_assignee_membership_fk";--> statement-breakpoint
ALTER TABLE "crm_conversation_attendances"
  ADD CONSTRAINT "conversation_attendances_scoped_assignee_membership_fk"
  FOREIGN KEY ("tenant_id", "store_id", "assigned_user_id")
  REFERENCES "public"."store_memberships"("tenant_id", "store_id", "user_id") NOT VALID;--> statement-breakpoint
ALTER TABLE "crm_conversation_attendances"
  VALIDATE CONSTRAINT "conversation_attendances_scoped_assignee_membership_fk";--> statement-breakpoint

CREATE OR REPLACE FUNCTION "crm_core_require_active_assignee"() RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  assignee_id uuid;
BEGIN
  assignee_id := nullif(to_jsonb(NEW) ->> TG_ARGV[0], '')::uuid;
  IF assignee_id IS NOT NULL AND NOT EXISTS (
    SELECT 1
    FROM "store_memberships" membership
    INNER JOIN "users" assignee ON assignee."id" = membership."user_id"
    WHERE membership."tenant_id" = NEW."tenant_id"
      AND membership."store_id" = NEW."store_id"
      AND membership."user_id" = assignee_id
      AND membership."status" = 'active'
      AND assignee."is_deleted" = false
  ) THEN
    RAISE EXCEPTION 'CRM assignee must be an active member of the exact tenant/store';
  END IF;
  RETURN NEW;
END;
$$;--> statement-breakpoint
CREATE TRIGGER "leads_active_assignee"
BEFORE INSERT OR UPDATE OF "tenant_id", "store_id", "assigned_user_id" ON "leads"
FOR EACH ROW EXECUTE FUNCTION "crm_core_require_active_assignee"('assigned_user_id');--> statement-breakpoint

CREATE TYPE "public"."canonical_message_origin" AS ENUM(
  'customer',
  'human_crm',
  'human_channel',
  'external_bot',
  'system',
  'unknown'
);--> statement-breakpoint
CREATE TYPE "public"."conversation_command_result" AS ENUM(
  'applied',
  'already_applied',
  'superseded'
);--> statement-breakpoint
CREATE TYPE "public"."conversation_attendance_actor_kind" AS ENUM(
  'user',
  'support',
  'provider',
  'bot',
  'system'
);--> statement-breakpoint

ALTER TABLE "crm_conversation_threads"
  ADD COLUMN "channel_metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
  ADD COLUMN "customer_chat_id" varchar(191),
  ADD COLUMN "customer_display_name" varchar(191),
  ADD COLUMN "customer_phone" varchar(40),
  ADD COLUMN "profile_photo_url" text,
  ADD COLUMN "source" varchar(80);--> statement-breakpoint
CREATE UNIQUE INDEX "conversation_threads_connection_customer_chat_unique"
  ON "crm_conversation_threads" ("provider_connection_id", "customer_chat_id")
  WHERE "customer_chat_id" IS NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "conversation_threads_connection_customer_phone_unique"
  ON "crm_conversation_threads" ("provider_connection_id", "customer_phone")
  WHERE "customer_phone" IS NOT NULL AND "customer_phone" <> '';--> statement-breakpoint

ALTER TABLE "crm_conversation_cycles"
  ADD COLUMN "first_handled_at" timestamp with time zone,
  ADD COLUMN "fresh_lead_at" timestamp with time zone,
  ADD COLUMN "last_customer_read_at" timestamp with time zone,
  ADD COLUMN "last_message_at" timestamp with time zone,
  ADD COLUMN "last_message_content" text,
  ADD COLUMN "last_read_at" timestamp with time zone,
  ADD COLUMN "message_count" integer DEFAULT 0 NOT NULL,
  ADD CONSTRAINT "conversation_cycles_message_count_nonnegative"
    CHECK ("message_count" >= 0);--> statement-breakpoint
CREATE INDEX "conversation_cycles_store_fresh_idx"
  ON "crm_conversation_cycles" ("store_id", "fresh_lead_at", "first_handled_at");--> statement-breakpoint
CREATE INDEX "conversation_cycles_store_last_message_idx"
  ON "crm_conversation_cycles" ("store_id", "last_message_at");--> statement-breakpoint

ALTER TABLE "crm_conversation_attendances"
  ADD COLUMN "assigned_at" timestamp with time zone,
  ADD COLUMN "handback_requested_at" timestamp with time zone,
  ADD COLUMN "handoff_requested_at" timestamp with time zone,
  ADD COLUMN "handling_started_at" timestamp with time zone,
  ADD COLUMN "history_started_at" timestamp with time zone DEFAULT now() NOT NULL,
  ADD COLUMN "intervention_id" uuid,
  ADD COLUMN "state_version" integer DEFAULT 0 NOT NULL,
  ADD CONSTRAINT "conversation_attendances_state_version_nonnegative"
    CHECK ("state_version" >= 0),
  ADD CONSTRAINT "conversation_attendances_assignment_timestamp_check"
    CHECK ("assigned_user_id" IS NULL OR "assigned_at" IS NOT NULL),
  ADD CONSTRAINT "conversation_attendances_handoff_timestamp_check"
    CHECK ("state" <> 'handoff_requested' OR "handoff_requested_at" IS NOT NULL),
  ADD CONSTRAINT "conversation_attendances_handling_timestamp_check"
    CHECK ("state" <> 'human_active' OR "handling_started_at" IS NOT NULL);--> statement-breakpoint

ALTER TABLE "crm_messages"
  ADD COLUMN "deleted_at" timestamp with time zone,
  ADD COLUMN "sender_origin" "canonical_message_origin" DEFAULT 'unknown' NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "canonical_messages_semantic_id_unique"
  ON "crm_messages" ("tenant_id", "store_id", "id", "cycle_id", "thread_id");--> statement-breakpoint

CREATE UNIQUE INDEX "crm_tags_scope_id_unique"
  ON "crm_tags" ("tenant_id", "store_id", "id");--> statement-breakpoint

CREATE TABLE "crm_conversation_thread_tags" (
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  "store_id" uuid NOT NULL,
  "tag_id" uuid NOT NULL,
  "tenant_id" uuid NOT NULL,
  "thread_id" uuid NOT NULL
);--> statement-breakpoint
ALTER TABLE "crm_conversation_thread_tags"
  ADD CONSTRAINT "conversation_thread_tags_store_id_stores_id_fk"
    FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id"),
  ADD CONSTRAINT "conversation_thread_tags_tag_id_crm_tags_id_fk"
    FOREIGN KEY ("tag_id") REFERENCES "public"."crm_tags"("id"),
  ADD CONSTRAINT "conversation_thread_tags_tenant_id_tenants_id_fk"
    FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id"),
  ADD CONSTRAINT "conversation_thread_tags_thread_id_crm_conversation_threads_id_fk"
    FOREIGN KEY ("thread_id") REFERENCES "public"."crm_conversation_threads"("id"),
  ADD CONSTRAINT "conversation_thread_tags_store_tenant_fk"
    FOREIGN KEY ("store_id", "tenant_id") REFERENCES "public"."stores"("id", "tenant_id"),
  ADD CONSTRAINT "conversation_thread_tags_scoped_thread_fk"
    FOREIGN KEY ("tenant_id", "store_id", "thread_id")
    REFERENCES "public"."crm_conversation_threads"("tenant_id", "store_id", "id"),
  ADD CONSTRAINT "conversation_thread_tags_scoped_tag_fk"
    FOREIGN KEY ("tenant_id", "store_id", "tag_id")
    REFERENCES "public"."crm_tags"("tenant_id", "store_id", "id");--> statement-breakpoint
CREATE UNIQUE INDEX "conversation_thread_tags_unique"
  ON "crm_conversation_thread_tags" ("thread_id", "tag_id");--> statement-breakpoint
CREATE INDEX "conversation_thread_tags_tag_idx"
  ON "crm_conversation_thread_tags" ("tag_id", "thread_id");--> statement-breakpoint

CREATE TABLE "crm_conversation_command_receipts" (
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  "command_id" uuid NOT NULL,
  "command_type" varchar(40) NOT NULL,
  "cycle_id" uuid NOT NULL,
  "cycle_revision" bigint,
  "request_fingerprint" varchar(64) NOT NULL,
  "result" "conversation_command_result",
  "store_id" uuid NOT NULL,
  "tenant_id" uuid NOT NULL,
  "thread_id" uuid NOT NULL,
  CONSTRAINT "conversation_command_receipts_completion_consistent"
    CHECK (("result" IS NULL AND "cycle_revision" IS NULL) OR ("result" IS NOT NULL AND "cycle_revision" IS NOT NULL)),
  CONSTRAINT "conversation_command_receipts_revision_nonnegative"
    CHECK ("cycle_revision" IS NULL OR "cycle_revision" >= 0)
);--> statement-breakpoint
ALTER TABLE "crm_conversation_command_receipts"
  ADD CONSTRAINT "conversation_command_receipts_store_id_stores_id_fk"
    FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id"),
  ADD CONSTRAINT "conversation_command_receipts_tenant_id_tenants_id_fk"
    FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id"),
  ADD CONSTRAINT "conversation_command_receipts_store_tenant_fk"
    FOREIGN KEY ("store_id", "tenant_id") REFERENCES "public"."stores"("id", "tenant_id"),
  ADD CONSTRAINT "conversation_command_receipts_scoped_thread_fk"
    FOREIGN KEY ("tenant_id", "store_id", "thread_id")
    REFERENCES "public"."crm_conversation_threads"("tenant_id", "store_id", "id"),
  ADD CONSTRAINT "conversation_command_receipts_semantic_cycle_fk"
    FOREIGN KEY ("tenant_id", "store_id", "cycle_id", "thread_id")
    REFERENCES "public"."crm_conversation_cycles"("tenant_id", "store_id", "id", "thread_id");--> statement-breakpoint
CREATE UNIQUE INDEX "conversation_command_receipts_scope_command_unique"
  ON "crm_conversation_command_receipts" ("tenant_id", "store_id", "command_id");--> statement-breakpoint
CREATE INDEX "conversation_command_receipts_cycle_created_idx"
  ON "crm_conversation_command_receipts" ("tenant_id", "store_id", "cycle_id", "created_at");--> statement-breakpoint

CREATE TABLE "crm_conversation_attendance_events" (
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  "actor_id" varchar(191) NOT NULL,
  "actor_kind" "conversation_attendance_actor_kind" NOT NULL,
  "cycle_id" uuid NOT NULL,
  "idempotency_key" varchar(191) NOT NULL,
  "intervention_id" uuid NOT NULL,
  "next_state" "conversation_attendance_state" NOT NULL,
  "occurred_at" timestamp with time zone DEFAULT now() NOT NULL,
  "previous_state" "conversation_attendance_state" NOT NULL,
  "reason" text NOT NULL,
  "request_fingerprint" varchar(128) NOT NULL,
  "state_version" bigint NOT NULL,
  "store_id" uuid NOT NULL,
  "tenant_id" uuid NOT NULL,
  "thread_id" uuid NOT NULL,
  CONSTRAINT "conversation_attendance_events_version_positive" CHECK ("state_version" > 0),
  CONSTRAINT "conversation_attendance_events_state_changed" CHECK ("previous_state" <> "next_state")
);--> statement-breakpoint
ALTER TABLE "crm_conversation_attendance_events"
  ADD CONSTRAINT "conversation_attendance_events_store_id_stores_id_fk"
    FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id"),
  ADD CONSTRAINT "conversation_attendance_events_tenant_id_tenants_id_fk"
    FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id"),
  ADD CONSTRAINT "conversation_attendance_events_store_tenant_fk"
    FOREIGN KEY ("store_id", "tenant_id") REFERENCES "public"."stores"("id", "tenant_id"),
  ADD CONSTRAINT "conversation_attendance_events_semantic_cycle_fk"
    FOREIGN KEY ("tenant_id", "store_id", "cycle_id", "thread_id")
    REFERENCES "public"."crm_conversation_cycles"("tenant_id", "store_id", "id", "thread_id");--> statement-breakpoint
CREATE UNIQUE INDEX "conversation_attendance_events_scope_key_unique"
  ON "crm_conversation_attendance_events" ("tenant_id", "store_id", "cycle_id", "idempotency_key");--> statement-breakpoint
CREATE UNIQUE INDEX "conversation_attendance_events_scope_version_unique"
  ON "crm_conversation_attendance_events" ("tenant_id", "store_id", "cycle_id", "state_version");--> statement-breakpoint
CREATE INDEX "conversation_attendance_events_cycle_occurred_idx"
  ON "crm_conversation_attendance_events" ("cycle_id", "occurred_at");--> statement-breakpoint

CREATE FUNCTION "crm_conversation_attendance_transition_has_event"() RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  matching_event_rows integer;
BEGIN
  IF OLD."state" = NEW."state" AND OLD."state_version" = NEW."state_version" THEN
    RETURN NULL;
  END IF;

  IF OLD."state" = NEW."state"
    OR NEW."state_version" <> OLD."state_version" + 1 THEN
    RAISE EXCEPTION 'CRM conversation attendance state and version must transition together';
  END IF;

  SELECT count(*) INTO matching_event_rows
  FROM "crm_conversation_attendance_events" event
  WHERE event."tenant_id" = NEW."tenant_id"
    AND event."store_id" = NEW."store_id"
    AND event."thread_id" = NEW."thread_id"
    AND event."cycle_id" = NEW."cycle_id"
    AND event."state_version" = NEW."state_version"
    AND event."previous_state" = OLD."state"
    AND event."next_state" = NEW."state";

  IF matching_event_rows <> 1 THEN
    RAISE EXCEPTION 'CRM conversation attendance transition requires exactly one matching event';
  END IF;
  RETURN NULL;
END;
$$;--> statement-breakpoint
CREATE CONSTRAINT TRIGGER "crm_conversation_attendance_transition_has_event_trigger"
AFTER UPDATE ON "crm_conversation_attendances"
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW EXECUTE FUNCTION "crm_conversation_attendance_transition_has_event"();--> statement-breakpoint

CREATE FUNCTION "crm_conversation_attendance_event_matches_state"() RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM "crm_conversation_attendances" attendance
    WHERE attendance."tenant_id" = NEW."tenant_id"
      AND attendance."store_id" = NEW."store_id"
      AND attendance."thread_id" = NEW."thread_id"
      AND attendance."cycle_id" = NEW."cycle_id"
      AND attendance."state" = NEW."next_state"
      AND attendance."state_version" = NEW."state_version"
  ) THEN
    RAISE EXCEPTION 'CRM conversation attendance event requires the matching persisted state';
  END IF;
  RETURN NULL;
END;
$$;--> statement-breakpoint
CREATE CONSTRAINT TRIGGER "crm_conversation_attendance_event_matches_state_trigger"
AFTER INSERT ON "crm_conversation_attendance_events"
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW EXECUTE FUNCTION "crm_conversation_attendance_event_matches_state"();--> statement-breakpoint

CREATE FUNCTION "crm_conversation_attendance_events_append_only"() RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION 'CRM conversation attendance events are append-only';
END;
$$;--> statement-breakpoint
CREATE TRIGGER "crm_conversation_attendance_events_append_only_trigger"
BEFORE UPDATE OR DELETE ON "crm_conversation_attendance_events"
FOR EACH ROW EXECUTE FUNCTION "crm_conversation_attendance_events_append_only"();--> statement-breakpoint
CREATE TRIGGER "crm_conversation_attendance_events_no_truncate_trigger"
BEFORE TRUNCATE ON "crm_conversation_attendance_events"
FOR EACH STATEMENT EXECUTE FUNCTION "crm_conversation_attendance_events_append_only"();--> statement-breakpoint

DROP VIEW IF EXISTS "crm_retention_legacy_coverage";--> statement-breakpoint

ALTER TABLE "crm_webhook_effect_outbox"
  DROP CONSTRAINT IF EXISTS "crm_webhook_effect_outbox_message_id_crm_whatsapp_messages_id_fk",
  DROP CONSTRAINT IF EXISTS "crm_webhook_effect_outbox_session_id_crm_whatsapp_sessions_id_fk",
  DROP CONSTRAINT IF EXISTS "crm_webhook_effect_outbox_scoped_session_fk",
  DROP CONSTRAINT IF EXISTS "crm_webhook_effect_outbox_scoped_message_fk";--> statement-breakpoint
ALTER TABLE "crm_webhook_effect_outbox"
  RENAME COLUMN "session_id" TO "cycle_id";--> statement-breakpoint
ALTER TABLE "crm_webhook_effect_outbox" ADD COLUMN "thread_id" uuid NOT NULL;--> statement-breakpoint
ALTER TABLE "crm_webhook_effect_outbox"
  ADD CONSTRAINT "crm_webhook_effect_outbox_message_fk"
    FOREIGN KEY ("message_id") REFERENCES "public"."crm_messages"("id"),
  ADD CONSTRAINT "crm_webhook_effect_outbox_scoped_thread_fk"
    FOREIGN KEY ("tenant_id", "store_id", "thread_id")
    REFERENCES "public"."crm_conversation_threads"("tenant_id", "store_id", "id"),
  ADD CONSTRAINT "crm_webhook_effect_outbox_semantic_cycle_fk"
    FOREIGN KEY ("tenant_id", "store_id", "cycle_id", "thread_id")
    REFERENCES "public"."crm_conversation_cycles"("tenant_id", "store_id", "id", "thread_id"),
  ADD CONSTRAINT "crm_webhook_effect_outbox_semantic_message_fk"
    FOREIGN KEY ("tenant_id", "store_id", "message_id", "cycle_id", "thread_id")
    REFERENCES "public"."crm_messages"("tenant_id", "store_id", "id", "cycle_id", "thread_id");--> statement-breakpoint

ALTER TABLE "crm_whatsapp_outbound_intents"
  DROP CONSTRAINT IF EXISTS "crm_whatsapp_outbound_intents_message_id_crm_whatsapp_messages_id_fk",
  DROP CONSTRAINT IF EXISTS "crm_whatsapp_outbound_intents_session_id_crm_whatsapp_sessions_id_fk",
  DROP CONSTRAINT IF EXISTS "crm_whatsapp_outbound_intents_scoped_session_fk",
  DROP CONSTRAINT IF EXISTS "crm_whatsapp_outbound_intents_scoped_message_fk";--> statement-breakpoint
ALTER TABLE "crm_whatsapp_outbound_intents"
  RENAME COLUMN "session_id" TO "cycle_id";--> statement-breakpoint
ALTER TABLE "crm_whatsapp_outbound_intents" ADD COLUMN "thread_id" uuid;--> statement-breakpoint
ALTER TABLE "crm_whatsapp_outbound_intents"
  ADD CONSTRAINT "crm_whatsapp_outbound_intents_message_fk"
    FOREIGN KEY ("message_id") REFERENCES "public"."crm_messages"("id"),
  ADD CONSTRAINT "crm_whatsapp_outbound_intents_scoped_thread_fk"
    FOREIGN KEY ("tenant_id", "store_id", "thread_id")
    REFERENCES "public"."crm_conversation_threads"("tenant_id", "store_id", "id"),
  ADD CONSTRAINT "crm_whatsapp_outbound_intents_semantic_cycle_fk"
    FOREIGN KEY ("tenant_id", "store_id", "cycle_id", "thread_id")
    REFERENCES "public"."crm_conversation_cycles"("tenant_id", "store_id", "id", "thread_id"),
  ADD CONSTRAINT "crm_whatsapp_outbound_intents_semantic_message_fk"
    FOREIGN KEY ("tenant_id", "store_id", "message_id", "cycle_id", "thread_id")
    REFERENCES "public"."crm_messages"("tenant_id", "store_id", "id", "cycle_id", "thread_id");--> statement-breakpoint

ALTER TABLE "crm_whatsapp_scheduled_messages"
  DROP CONSTRAINT IF EXISTS "crm_whatsapp_scheduled_messages_sent_message_id_crm_whatsapp_messages_id_fk",
  DROP CONSTRAINT IF EXISTS "crm_whatsapp_scheduled_messages_session_id_crm_whatsapp_sessions_id_fk";--> statement-breakpoint
ALTER TABLE "crm_whatsapp_scheduled_messages"
  RENAME COLUMN "session_id" TO "cycle_id";--> statement-breakpoint
ALTER TABLE "crm_whatsapp_scheduled_messages"
  ADD COLUMN "thread_id" uuid NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "crm_whatsapp_campaigns_scope_id_unique"
  ON "crm_whatsapp_campaigns" ("tenant_id", "store_id", "id");--> statement-breakpoint
CREATE UNIQUE INDEX "crm_whatsapp_scheduled_messages_scope_id_unique"
  ON "crm_whatsapp_scheduled_messages" ("tenant_id", "store_id", "id");--> statement-breakpoint
CREATE UNIQUE INDEX "leads_scope_id_unique"
  ON "leads" ("tenant_id", "store_id", "id");--> statement-breakpoint
CREATE UNIQUE INDEX "sales_scope_id_unique"
  ON "sales" ("tenant_id", "store_id", "id");--> statement-breakpoint
CREATE UNIQUE INDEX "crm_pipeline_stages_scope_id_unique"
  ON "crm_pipeline_stages" ("tenant_id", "store_id", "id");--> statement-breakpoint
ALTER TABLE "crm_whatsapp_scheduled_messages"
  ADD CONSTRAINT "crm_whatsapp_scheduled_messages_sent_message_fk"
    FOREIGN KEY ("sent_message_id") REFERENCES "public"."crm_messages"("id"),
  ADD CONSTRAINT "crm_whatsapp_scheduled_messages_scoped_thread_fk"
    FOREIGN KEY ("tenant_id", "store_id", "thread_id")
    REFERENCES "public"."crm_conversation_threads"("tenant_id", "store_id", "id"),
  ADD CONSTRAINT "crm_whatsapp_scheduled_messages_semantic_cycle_fk"
    FOREIGN KEY ("tenant_id", "store_id", "cycle_id", "thread_id")
    REFERENCES "public"."crm_conversation_cycles"("tenant_id", "store_id", "id", "thread_id"),
  ADD CONSTRAINT "crm_whatsapp_scheduled_messages_scoped_campaign_fk"
    FOREIGN KEY ("tenant_id", "store_id", "campaign_id")
    REFERENCES "public"."crm_whatsapp_campaigns"("tenant_id", "store_id", "id"),
  ADD CONSTRAINT "crm_whatsapp_scheduled_messages_scoped_creator_membership_fk"
    FOREIGN KEY ("tenant_id", "store_id", "created_by_user_id")
    REFERENCES "public"."store_memberships"("tenant_id", "store_id", "user_id"),
  ADD CONSTRAINT "crm_whatsapp_scheduled_messages_scoped_sent_message_fk"
    FOREIGN KEY ("tenant_id", "store_id", "sent_message_id")
    REFERENCES "public"."crm_messages"("tenant_id", "store_id", "id");--> statement-breakpoint
DROP INDEX IF EXISTS "crm_whatsapp_scheduled_messages_session_idx";--> statement-breakpoint
CREATE INDEX "crm_whatsapp_scheduled_messages_thread_idx"
  ON "crm_whatsapp_scheduled_messages" ("thread_id");--> statement-breakpoint
CREATE INDEX "crm_whatsapp_scheduled_messages_cycle_idx"
  ON "crm_whatsapp_scheduled_messages" ("cycle_id");--> statement-breakpoint

ALTER TABLE "crm_whatsapp_campaign_recipients"
  DROP CONSTRAINT IF EXISTS "crm_whatsapp_campaign_recipients_session_id_crm_whatsapp_sessions_id_fk";--> statement-breakpoint
ALTER TABLE "crm_whatsapp_campaign_recipients"
  RENAME COLUMN "session_id" TO "thread_id";--> statement-breakpoint
ALTER TABLE "crm_whatsapp_campaign_recipients"
  ADD CONSTRAINT "crm_whatsapp_campaign_recipients_scoped_thread_fk"
    FOREIGN KEY ("tenant_id", "store_id", "thread_id")
    REFERENCES "public"."crm_conversation_threads"("tenant_id", "store_id", "id"),
  ADD CONSTRAINT "crm_whatsapp_campaign_recipients_scoped_campaign_fk"
    FOREIGN KEY ("tenant_id", "store_id", "campaign_id")
    REFERENCES "public"."crm_whatsapp_campaigns"("tenant_id", "store_id", "id"),
  ADD CONSTRAINT "crm_whatsapp_campaign_recipients_scoped_lead_fk"
    FOREIGN KEY ("tenant_id", "store_id", "lead_id")
    REFERENCES "public"."leads"("tenant_id", "store_id", "id"),
  ADD CONSTRAINT "crm_whatsapp_campaign_recipients_scoped_reply_message_fk"
    FOREIGN KEY ("tenant_id", "store_id", "reply_message_id")
    REFERENCES "public"."crm_messages"("tenant_id", "store_id", "id"),
  ADD CONSTRAINT "crm_whatsapp_campaign_recipients_scoped_sent_message_fk"
    FOREIGN KEY ("tenant_id", "store_id", "sent_message_id")
    REFERENCES "public"."crm_messages"("tenant_id", "store_id", "id");--> statement-breakpoint
DROP INDEX IF EXISTS "crm_whatsapp_campaign_recipients_campaign_session_unique";--> statement-breakpoint
DROP INDEX IF EXISTS "crm_whatsapp_campaign_recipients_session_status_idx";--> statement-breakpoint
CREATE UNIQUE INDEX "crm_whatsapp_campaign_recipients_campaign_thread_unique"
  ON "crm_whatsapp_campaign_recipients" ("campaign_id", "thread_id");--> statement-breakpoint
CREATE INDEX "crm_whatsapp_campaign_recipients_thread_status_idx"
  ON "crm_whatsapp_campaign_recipients" ("thread_id", "status", "updated_at");--> statement-breakpoint

ALTER TABLE "crm_lead_outcomes"
  DROP CONSTRAINT IF EXISTS "crm_lead_outcomes_origin_session_id_crm_whatsapp_sessions_id_fk";--> statement-breakpoint
ALTER TABLE "crm_lead_outcomes"
  RENAME COLUMN "origin_session_id" TO "origin_cycle_id";--> statement-breakpoint
ALTER TABLE "crm_lead_outcomes"
  ALTER COLUMN "channel" TYPE "messaging_channel"
  USING CASE "channel"
    WHEN 'WHATSAPP' THEN 'whatsapp'::"messaging_channel"
    WHEN 'INSTAGRAM' THEN 'instagram'::"messaging_channel"
    WHEN 'OLX_CHAT' THEN 'olx_chat'::"messaging_channel"
    ELSE NULL
  END;--> statement-breakpoint
ALTER TABLE "crm_lead_outcomes"
  ADD CONSTRAINT "crm_lead_outcomes_origin_cycle_fk"
    FOREIGN KEY ("origin_cycle_id") REFERENCES "public"."crm_conversation_cycles"("id"),
  ADD CONSTRAINT "crm_lead_outcomes_scoped_origin_cycle_fk"
    FOREIGN KEY ("tenant_id", "store_id", "origin_cycle_id")
    REFERENCES "public"."crm_conversation_cycles"("tenant_id", "store_id", "id"),
  ADD CONSTRAINT "crm_lead_outcomes_scoped_lead_fk"
    FOREIGN KEY ("tenant_id", "store_id", "lead_id")
    REFERENCES "public"."leads"("tenant_id", "store_id", "id"),
  ADD CONSTRAINT "crm_lead_outcomes_scoped_sale_fk"
    FOREIGN KEY ("tenant_id", "store_id", "sale_id")
    REFERENCES "public"."sales"("tenant_id", "store_id", "id"),
  ADD CONSTRAINT "crm_lead_outcomes_scoped_next_pipeline_stage_fk"
    FOREIGN KEY ("tenant_id", "store_id", "next_pipeline_stage_id")
    REFERENCES "public"."crm_pipeline_stages"("tenant_id", "store_id", "id"),
  ADD CONSTRAINT "crm_lead_outcomes_scoped_previous_pipeline_stage_fk"
    FOREIGN KEY ("tenant_id", "store_id", "previous_pipeline_stage_id")
    REFERENCES "public"."crm_pipeline_stages"("tenant_id", "store_id", "id");--> statement-breakpoint

DROP TABLE "crm_whatsapp_intervention_ledger";--> statement-breakpoint
DROP TABLE "crm_whatsapp_session_command_receipts";--> statement-breakpoint
DROP TABLE "crm_whatsapp_session_tags";--> statement-breakpoint
DROP TABLE "crm_whatsapp_messages";--> statement-breakpoint
DROP TABLE "crm_whatsapp_sessions";--> statement-breakpoint
DROP TABLE "crm_connections";--> statement-breakpoint

DROP FUNCTION IF EXISTS "guard_crm_connection_provider_identity"();--> statement-breakpoint
DROP FUNCTION IF EXISTS "crm_whatsapp_session_transition_has_ledger"();--> statement-breakpoint
DROP FUNCTION IF EXISTS "crm_whatsapp_ledger_revision_not_future"();--> statement-breakpoint
DROP FUNCTION IF EXISTS "crm_whatsapp_intervention_ledger_append_only"();--> statement-breakpoint
DROP FUNCTION IF EXISTS "crm_whatsapp_sessions_revision_increment"();--> statement-breakpoint

DROP TYPE "public"."crm_whatsapp_session_command_result";--> statement-breakpoint
DROP TYPE "public"."crm_whatsapp_human_attendance_state";--> statement-breakpoint
DROP TYPE "public"."crm_whatsapp_session_status";--> statement-breakpoint
DROP TYPE "public"."crm_whatsapp_message_sender_origin";--> statement-breakpoint
DROP TYPE "public"."crm_whatsapp_message_sender_type";--> statement-breakpoint
DROP TYPE "public"."crm_whatsapp_message_direction";--> statement-breakpoint
DROP TYPE "public"."crm_whatsapp_message_status";--> statement-breakpoint
DROP TYPE "public"."crm_whatsapp_message_type";--> statement-breakpoint
DROP TYPE "public"."crm_whatsapp_channel";--> statement-breakpoint
DROP TYPE "public"."crm_connection_provider";--> statement-breakpoint
DROP TYPE "public"."crm_connection_status";
