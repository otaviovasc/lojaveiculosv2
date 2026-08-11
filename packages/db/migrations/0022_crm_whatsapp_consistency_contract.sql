CREATE TYPE "public"."crm_whatsapp_message_sender_origin" AS ENUM('customer', 'human_crm', 'human_whatsapp', 'bot_api', 'system', 'unknown');--> statement-breakpoint
CREATE TYPE "public"."crm_whatsapp_intervention_actor_kind" AS ENUM('user', 'support', 'provider', 'bot', 'system');--> statement-breakpoint
CREATE TABLE "crm_whatsapp_intervention_ledger" (
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"actor_id" varchar(191) NOT NULL,
	"actor_kind" "crm_whatsapp_intervention_actor_kind" NOT NULL,
	"connection_id" uuid NOT NULL,
	"idempotency_key" varchar(191) NOT NULL,
	"intervention_id" uuid NOT NULL,
	"next_state" "crm_whatsapp_human_attendance_state",
	"occurred_at" timestamp with time zone DEFAULT now() NOT NULL,
	"previous_state" "crm_whatsapp_human_attendance_state",
	"reason" text NOT NULL,
	"request_fingerprint" varchar(128) NOT NULL,
	"session_id" uuid NOT NULL,
	"session_revision" bigint NOT NULL,
	"source" varchar(80) NOT NULL,
	"store_id" uuid NOT NULL,
	"tenant_id" uuid NOT NULL,
	CONSTRAINT "crm_whatsapp_intervention_ledger_revision_positive" CHECK ("crm_whatsapp_intervention_ledger"."session_revision" > 0),
	CONSTRAINT "crm_whatsapp_intervention_ledger_request_fingerprint_nonempty" CHECK (btrim("crm_whatsapp_intervention_ledger"."request_fingerprint") <> ''),
	CONSTRAINT "crm_whatsapp_intervention_ledger_state_changed" CHECK ("crm_whatsapp_intervention_ledger"."previous_state" IS DISTINCT FROM "crm_whatsapp_intervention_ledger"."next_state")
);
--> statement-breakpoint
ALTER TABLE "crm_whatsapp_messages" ADD COLUMN "sender_origin" "crm_whatsapp_message_sender_origin";--> statement-breakpoint
UPDATE "crm_whatsapp_messages"
SET "sender_origin" = CASE
	WHEN "sender_type" = 'CUSTOMER' THEN 'customer'::"crm_whatsapp_message_sender_origin"
	WHEN "sender_type" = 'AI' THEN 'bot_api'::"crm_whatsapp_message_sender_origin"
	WHEN "sender_type" = 'SYSTEM' THEN 'system'::"crm_whatsapp_message_sender_origin"
	WHEN "sender_type" = 'HUMAN'
		AND (
			("metadata" ->> 'sentByActorId') IS NOT NULL
			AND btrim("metadata" ->> 'sentByActorId') <> ''
			OR "metadata" @> '{"sentByCrm": true}'::jsonb
		)
		THEN 'human_crm'::"crm_whatsapp_message_sender_origin"
	ELSE 'unknown'::"crm_whatsapp_message_sender_origin"
END;--> statement-breakpoint
ALTER TABLE "crm_whatsapp_messages" ALTER COLUMN "sender_origin" SET DEFAULT 'unknown';--> statement-breakpoint
ALTER TABLE "crm_whatsapp_messages" ALTER COLUMN "sender_origin" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "crm_whatsapp_sessions" ADD COLUMN "intervention_history_started_at" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "crm_whatsapp_sessions" ADD COLUMN "revision" bigint DEFAULT 0 NOT NULL;--> statement-breakpoint
DO $$
BEGIN
	IF EXISTS (
		SELECT 1
		FROM "crm_whatsapp_sessions" AS session
		LEFT JOIN "crm_connections" AS connection
			ON connection."id" = session."connection_id"
		WHERE connection."id" IS NULL
			OR connection."tenant_id" IS DISTINCT FROM session."tenant_id"
			OR connection."store_id" IS DISTINCT FROM session."store_id"
	) THEN
		RAISE EXCEPTION 'CRM WhatsApp consistency migration blocked: session connection scope mismatch or orphan';
	END IF;

	IF EXISTS (
		SELECT 1
		FROM "crm_whatsapp_messages" AS message
		LEFT JOIN "crm_whatsapp_sessions" AS session
			ON session."id" = message."session_id"
		WHERE session."id" IS NULL
			OR session."tenant_id" IS DISTINCT FROM message."tenant_id"
			OR session."store_id" IS DISTINCT FROM message."store_id"
			OR session."connection_id" IS DISTINCT FROM message."connection_id"
	) THEN
		RAISE EXCEPTION 'CRM WhatsApp consistency migration blocked: message session scope mismatch or orphan';
	END IF;
END
$$;--> statement-breakpoint
ALTER TABLE "crm_whatsapp_intervention_ledger" ADD CONSTRAINT "crm_whatsapp_intervention_ledger_store_id_stores_id_fk" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crm_whatsapp_intervention_ledger" ADD CONSTRAINT "crm_whatsapp_intervention_ledger_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crm_whatsapp_intervention_ledger" ADD CONSTRAINT "crm_whatsapp_intervention_ledger_scoped_connection_fk" FOREIGN KEY ("tenant_id","store_id","connection_id") REFERENCES "public"."crm_connections"("tenant_id","store_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crm_whatsapp_intervention_ledger" ADD CONSTRAINT "crm_whatsapp_intervention_ledger_scoped_session_fk" FOREIGN KEY ("tenant_id","store_id","connection_id","session_id") REFERENCES "public"."crm_whatsapp_sessions"("tenant_id","store_id","connection_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "crm_whatsapp_intervention_ledger_scope_key_unique" ON "crm_whatsapp_intervention_ledger" USING btree ("tenant_id","store_id","session_id","idempotency_key");--> statement-breakpoint
CREATE UNIQUE INDEX "crm_whatsapp_intervention_ledger_scope_revision_unique" ON "crm_whatsapp_intervention_ledger" USING btree ("tenant_id","store_id","session_id","session_revision");--> statement-breakpoint
CREATE UNIQUE INDEX "crm_whatsapp_intervention_ledger_scope_transition_unique" ON "crm_whatsapp_intervention_ledger" USING btree ("tenant_id","store_id","session_id","intervention_id","session_revision");--> statement-breakpoint
CREATE INDEX "crm_whatsapp_intervention_ledger_session_occurred_idx" ON "crm_whatsapp_intervention_ledger" USING btree ("session_id","occurred_at");--> statement-breakpoint
ALTER TABLE "crm_whatsapp_messages" ADD CONSTRAINT "crm_whatsapp_messages_scoped_session_fk" FOREIGN KEY ("tenant_id","store_id","connection_id","session_id") REFERENCES "public"."crm_whatsapp_sessions"("tenant_id","store_id","connection_id","id") ON DELETE no action ON UPDATE no action NOT VALID;--> statement-breakpoint
ALTER TABLE "crm_whatsapp_sessions" ADD CONSTRAINT "crm_whatsapp_sessions_scoped_connection_fk" FOREIGN KEY ("tenant_id","store_id","connection_id") REFERENCES "public"."crm_connections"("tenant_id","store_id","id") ON DELETE no action ON UPDATE no action NOT VALID;--> statement-breakpoint
ALTER TABLE "crm_whatsapp_sessions" ADD CONSTRAINT "crm_whatsapp_sessions_revision_nonnegative" CHECK ("crm_whatsapp_sessions"."revision" >= 0) NOT VALID;--> statement-breakpoint
ALTER TABLE "crm_whatsapp_messages" VALIDATE CONSTRAINT "crm_whatsapp_messages_scoped_session_fk";--> statement-breakpoint
ALTER TABLE "crm_whatsapp_sessions" VALIDATE CONSTRAINT "crm_whatsapp_sessions_scoped_connection_fk";--> statement-breakpoint
ALTER TABLE "crm_whatsapp_sessions" VALIDATE CONSTRAINT "crm_whatsapp_sessions_revision_nonnegative";--> statement-breakpoint
CREATE FUNCTION "crm_whatsapp_sessions_revision_increment"() RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
	IF NEW."revision" <> OLD."revision" + 1 THEN
		RAISE EXCEPTION 'CRM WhatsApp session revision must increment by exactly one';
	END IF;
	RETURN NEW;
END;
$$;--> statement-breakpoint
CREATE TRIGGER "crm_whatsapp_sessions_revision_increment_trigger"
BEFORE UPDATE ON "crm_whatsapp_sessions"
FOR EACH ROW EXECUTE FUNCTION "crm_whatsapp_sessions_revision_increment"();--> statement-breakpoint
CREATE FUNCTION "crm_whatsapp_session_transition_has_ledger"() RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
	matching_ledger_rows integer;
BEGIN
	IF OLD."human_attendance_state" IS NOT DISTINCT FROM NEW."human_attendance_state" THEN
		RETURN NULL;
	END IF;

	SELECT count(*)
	INTO matching_ledger_rows
	FROM "crm_whatsapp_intervention_ledger" AS ledger
	WHERE ledger."tenant_id" = NEW."tenant_id"
		AND ledger."store_id" = NEW."store_id"
		AND ledger."session_id" = NEW."id"
		AND ledger."session_revision" = NEW."revision"
		AND ledger."previous_state" IS NOT DISTINCT FROM OLD."human_attendance_state"
		AND ledger."next_state" IS NOT DISTINCT FROM NEW."human_attendance_state";

	IF matching_ledger_rows <> 1 THEN
		RAISE EXCEPTION 'CRM WhatsApp attendance transition requires exactly one matching ledger row';
	END IF;

	RETURN NULL;
END;
$$;--> statement-breakpoint
CREATE CONSTRAINT TRIGGER "crm_whatsapp_session_transition_has_ledger_trigger"
AFTER UPDATE ON "crm_whatsapp_sessions"
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW EXECUTE FUNCTION "crm_whatsapp_session_transition_has_ledger"();--> statement-breakpoint
CREATE FUNCTION "crm_whatsapp_ledger_revision_not_future"() RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
	current_session_revision bigint;
BEGIN
	SELECT session."revision"
	INTO current_session_revision
	FROM "crm_whatsapp_sessions" AS session
	WHERE session."tenant_id" = NEW."tenant_id"
		AND session."store_id" = NEW."store_id"
		AND session."connection_id" = NEW."connection_id"
		AND session."id" = NEW."session_id";

	IF current_session_revision IS NULL OR NEW."session_revision" > current_session_revision THEN
		RAISE EXCEPTION 'CRM WhatsApp intervention ledger revision cannot be ahead of its session';
	END IF;

	RETURN NULL;
END;
$$;--> statement-breakpoint
CREATE CONSTRAINT TRIGGER "crm_whatsapp_ledger_revision_not_future_trigger"
AFTER INSERT ON "crm_whatsapp_intervention_ledger"
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW EXECUTE FUNCTION "crm_whatsapp_ledger_revision_not_future"();--> statement-breakpoint
CREATE FUNCTION "crm_whatsapp_intervention_ledger_append_only"() RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
	RAISE EXCEPTION 'CRM WhatsApp intervention ledger is append-only';
END;
$$;--> statement-breakpoint
CREATE TRIGGER "crm_whatsapp_intervention_ledger_append_only_trigger"
BEFORE UPDATE OR DELETE ON "crm_whatsapp_intervention_ledger"
FOR EACH ROW EXECUTE FUNCTION "crm_whatsapp_intervention_ledger_append_only"();--> statement-breakpoint
CREATE TRIGGER "crm_whatsapp_intervention_ledger_no_truncate_trigger"
BEFORE TRUNCATE ON "crm_whatsapp_intervention_ledger"
FOR EACH STATEMENT EXECUTE FUNCTION "crm_whatsapp_intervention_ledger_append_only"();
