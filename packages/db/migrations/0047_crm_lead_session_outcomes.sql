CREATE TYPE "public"."crm_lead_outcome_kind" AS ENUM('follow_up', 'lost', 'won');--> statement-breakpoint
CREATE TYPE "public"."crm_lead_outcome_loss_reason" AS ENUM('no_response', 'price', 'financing_not_approved', 'trade_in_valuation', 'vehicle_unavailable', 'bought_elsewhere', 'no_longer_interested', 'invalid_contact', 'other');--> statement-breakpoint
CREATE TYPE "public"."crm_lead_outcome_result" AS ENUM('applied', 'superseded');--> statement-breakpoint
CREATE TYPE "public"."crm_whatsapp_session_command_result" AS ENUM('applied', 'already_applied', 'superseded');--> statement-breakpoint
CREATE TABLE "crm_lead_outcomes" (
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"actor_id" varchar(191) NOT NULL,
	"actor_kind" varchar(40) NOT NULL,
	"channel" "crm_whatsapp_channel",
	"command_id" varchar(191) NOT NULL,
	"lead_id" uuid NOT NULL,
	"loss_note" text,
	"loss_reason" "crm_lead_outcome_loss_reason",
	"next_pipeline_stage_id" uuid,
	"origin_session_id" uuid,
	"outcome" "crm_lead_outcome_kind" NOT NULL,
	"previous_pipeline_stage_id" uuid,
	"request_fingerprint" varchar(64) NOT NULL,
	"result" "crm_lead_outcome_result" NOT NULL,
	"sale_id" uuid,
	"store_id" uuid NOT NULL,
	"tenant_id" uuid NOT NULL,
	CONSTRAINT "crm_lead_outcomes_loss_fields_consistent" CHECK (("crm_lead_outcomes"."outcome" = 'lost' AND "crm_lead_outcomes"."loss_reason" IS NOT NULL) OR ("crm_lead_outcomes"."outcome" <> 'lost' AND "crm_lead_outcomes"."loss_reason" IS NULL AND "crm_lead_outcomes"."loss_note" IS NULL)),
	CONSTRAINT "crm_lead_outcomes_other_note_present" CHECK ("crm_lead_outcomes"."loss_reason" <> 'other' OR NULLIF(BTRIM("crm_lead_outcomes"."loss_note"), '') IS NOT NULL),
	CONSTRAINT "crm_lead_outcomes_sale_consistent" CHECK (("crm_lead_outcomes"."outcome" = 'won' AND "crm_lead_outcomes"."sale_id" IS NOT NULL) OR ("crm_lead_outcomes"."outcome" <> 'won' AND "crm_lead_outcomes"."sale_id" IS NULL)),
	CONSTRAINT "crm_lead_outcomes_origin_consistent" CHECK ("crm_lead_outcomes"."outcome" = 'won' OR "crm_lead_outcomes"."origin_session_id" IS NOT NULL)
);
--> statement-breakpoint
CREATE TABLE "crm_whatsapp_session_command_receipts" (
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"command_id" uuid NOT NULL,
	"command_type" varchar(40) NOT NULL,
	"request_fingerprint" varchar(64) NOT NULL,
	"result" "crm_whatsapp_session_command_result",
	"session_id" uuid NOT NULL,
	"session_revision" bigint,
	"store_id" uuid NOT NULL,
	"tenant_id" uuid NOT NULL,
	CONSTRAINT "crm_whatsapp_session_command_receipts_completion_consistent" CHECK (("crm_whatsapp_session_command_receipts"."result" IS NULL AND "crm_whatsapp_session_command_receipts"."session_revision" IS NULL) OR ("crm_whatsapp_session_command_receipts"."result" IS NOT NULL AND "crm_whatsapp_session_command_receipts"."session_revision" IS NOT NULL)),
	CONSTRAINT "crm_whatsapp_session_command_receipts_revision_nonnegative" CHECK ("crm_whatsapp_session_command_receipts"."session_revision" IS NULL OR "crm_whatsapp_session_command_receipts"."session_revision" >= 0)
);
--> statement-breakpoint
WITH "required_stages" ("status", "name", "lead_status", "color", "sort_offset") AS (
	VALUES
		('open'::"crm_pipeline_stage_status", 'Em negociação', 'negotiating', '#3b82f6', 1),
		('won'::"crm_pipeline_stage_status", 'Ganho', 'won', '#22c55e', 2),
		('lost'::"crm_pipeline_stage_status", 'Perdido', 'lost', '#ef4444', 3)
)
INSERT INTO "crm_pipeline_stages" (
	"color",
	"is_system",
	"lead_status",
	"name",
	"pipeline_id",
	"sort_order",
	"status",
	"store_id",
	"tenant_id"
)
SELECT
	"required"."color",
	true,
	"required"."lead_status",
	"required"."name",
	"pipeline"."id",
	COALESCE((
		SELECT MAX("stage"."sort_order")
		FROM "crm_pipeline_stages" AS "stage"
		WHERE "stage"."pipeline_id" = "pipeline"."id"
	), -1) + "required"."sort_offset",
	"required"."status",
	"pipeline"."store_id",
	"pipeline"."tenant_id"
FROM "crm_pipelines" AS "pipeline"
CROSS JOIN "required_stages" AS "required"
WHERE "pipeline"."is_deleted" = false
	AND NOT EXISTS (
		SELECT 1
		FROM "crm_pipeline_stages" AS "stage"
		WHERE "stage"."pipeline_id" = "pipeline"."id"
			AND "stage"."tenant_id" = "pipeline"."tenant_id"
			AND "stage"."store_id" = "pipeline"."store_id"
			AND "stage"."status" = "required"."status"
			AND "stage"."is_deleted" = false
	);
--> statement-breakpoint
ALTER TABLE "crm_lead_outcomes" ADD CONSTRAINT "crm_lead_outcomes_lead_id_leads_id_fk" FOREIGN KEY ("lead_id") REFERENCES "public"."leads"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crm_lead_outcomes" ADD CONSTRAINT "crm_lead_outcomes_next_pipeline_stage_id_crm_pipeline_stages_id_fk" FOREIGN KEY ("next_pipeline_stage_id") REFERENCES "public"."crm_pipeline_stages"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crm_lead_outcomes" ADD CONSTRAINT "crm_lead_outcomes_origin_session_id_crm_whatsapp_sessions_id_fk" FOREIGN KEY ("origin_session_id") REFERENCES "public"."crm_whatsapp_sessions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crm_lead_outcomes" ADD CONSTRAINT "crm_lead_outcomes_previous_pipeline_stage_id_crm_pipeline_stages_id_fk" FOREIGN KEY ("previous_pipeline_stage_id") REFERENCES "public"."crm_pipeline_stages"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crm_lead_outcomes" ADD CONSTRAINT "crm_lead_outcomes_sale_id_sales_id_fk" FOREIGN KEY ("sale_id") REFERENCES "public"."sales"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crm_lead_outcomes" ADD CONSTRAINT "crm_lead_outcomes_store_id_stores_id_fk" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crm_lead_outcomes" ADD CONSTRAINT "crm_lead_outcomes_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crm_whatsapp_session_command_receipts" ADD CONSTRAINT "crm_whatsapp_session_command_receipts_store_id_stores_id_fk" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crm_whatsapp_session_command_receipts" ADD CONSTRAINT "crm_whatsapp_session_command_receipts_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "crm_whatsapp_sessions_scope_id_unique" ON "crm_whatsapp_sessions" USING btree ("tenant_id","store_id","id");--> statement-breakpoint
ALTER TABLE "crm_whatsapp_session_command_receipts" ADD CONSTRAINT "crm_whatsapp_session_command_receipts_scoped_session_fk" FOREIGN KEY ("tenant_id","store_id","session_id") REFERENCES "public"."crm_whatsapp_sessions"("tenant_id","store_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "crm_lead_outcomes_scope_command_unique" ON "crm_lead_outcomes" USING btree ("tenant_id","store_id","command_id");--> statement-breakpoint
CREATE INDEX "crm_lead_outcomes_lead_history_idx" ON "crm_lead_outcomes" USING btree ("tenant_id","store_id","lead_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "crm_whatsapp_session_command_receipts_scope_command_unique" ON "crm_whatsapp_session_command_receipts" USING btree ("tenant_id","store_id","command_id");--> statement-breakpoint
CREATE INDEX "crm_whatsapp_session_command_receipts_session_created_idx" ON "crm_whatsapp_session_command_receipts" USING btree ("tenant_id","store_id","session_id","created_at");
