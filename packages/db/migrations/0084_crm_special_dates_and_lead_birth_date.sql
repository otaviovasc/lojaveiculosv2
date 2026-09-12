CREATE TYPE "public"."crm_special_date_type" AS ENUM('birthday', 'purchaseAnniversary', 'easter', 'christmas', 'mothersDay', 'fathersDay', 'blackFriday');--> statement-breakpoint
ALTER TABLE "leads" ADD COLUMN "birth_date" date;--> statement-breakpoint
CREATE TABLE "crm_special_date_configs" (
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"id" uuid DEFAULT gen_random_uuid() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"connection_id" uuid NOT NULL,
	"date_type" "crm_special_date_type" NOT NULL,
	"enabled" boolean DEFAULT false NOT NULL,
	"lead_days" integer DEFAULT 0 NOT NULL,
	"message_template" text DEFAULT '' NOT NULL,
	"revision" integer DEFAULT 0 NOT NULL,
	"send_time" varchar(5) DEFAULT '09:00' NOT NULL,
	"store_id" uuid NOT NULL,
	"tenant_id" uuid NOT NULL,
	CONSTRAINT "crm_special_date_configs_pkey" PRIMARY KEY ("id"),
	CONSTRAINT "crm_special_date_configs_lead_days_chk" CHECK ("lead_days" >= 0 AND "lead_days" <= 30),
	CONSTRAINT "crm_special_date_configs_send_time_chk" CHECK ("send_time" ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$'),
	CONSTRAINT "crm_special_date_configs_revision_chk" CHECK ("revision" >= 0)
);
--> statement-breakpoint
CREATE TABLE "crm_special_date_executions" (
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"id" uuid DEFAULT gen_random_uuid() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"connection_id" uuid NOT NULL,
	"date_type" "crm_special_date_type" NOT NULL,
	"recipient_key" varchar(191) NOT NULL,
	"config_revision" integer DEFAULT 0 NOT NULL,
	"scheduled_message_id" uuid,
	"status" varchar(32) DEFAULT 'scheduled' NOT NULL,
	"store_id" uuid NOT NULL,
	"target_year" integer NOT NULL,
	"tenant_id" uuid NOT NULL,
	CONSTRAINT "crm_special_date_executions_pkey" PRIMARY KEY ("id"),
	CONSTRAINT "crm_special_date_executions_target_year_chk" CHECK ("target_year" >= 2000 AND "target_year" <= 2100),
	CONSTRAINT "crm_special_date_executions_status_chk" CHECK ("status" IN ('scheduled', 'sent', 'failed', 'cancelled')),
	CONSTRAINT "crm_special_date_executions_recipient_key_chk" CHECK (length(btrim("recipient_key")) > 0),
	CONSTRAINT "crm_special_date_executions_config_revision_chk" CHECK ("config_revision" >= 0)
);
--> statement-breakpoint
ALTER TABLE "crm_special_date_configs" ADD CONSTRAINT "crm_special_date_configs_store_tenant_fk" FOREIGN KEY ("store_id","tenant_id") REFERENCES "public"."stores"("id","tenant_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crm_special_date_configs" ADD CONSTRAINT "crm_special_date_configs_scoped_connection_fk" FOREIGN KEY ("tenant_id","store_id","connection_id") REFERENCES "public"."crm_channel_connections"("tenant_id","store_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "crm_special_date_configs_connection_type_unique" ON "crm_special_date_configs" USING btree ("tenant_id","store_id","connection_id","date_type");--> statement-breakpoint
CREATE INDEX "crm_special_date_configs_store_enabled_idx" ON "crm_special_date_configs" USING btree ("store_id","enabled");--> statement-breakpoint
ALTER TABLE "crm_special_date_executions" ADD CONSTRAINT "crm_special_date_executions_store_tenant_fk" FOREIGN KEY ("store_id","tenant_id") REFERENCES "public"."stores"("id","tenant_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crm_special_date_executions" ADD CONSTRAINT "crm_special_date_executions_scoped_connection_fk" FOREIGN KEY ("tenant_id","store_id","connection_id") REFERENCES "public"."crm_channel_connections"("tenant_id","store_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crm_special_date_executions" ADD CONSTRAINT "crm_special_date_executions_scoped_scheduled_message_fk" FOREIGN KEY ("tenant_id","store_id","scheduled_message_id") REFERENCES "public"."crm_scheduled_messages"("tenant_id","store_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "crm_special_date_executions_unique" ON "crm_special_date_executions" USING btree ("tenant_id","store_id","connection_id","date_type","target_year","recipient_key");--> statement-breakpoint
CREATE INDEX "crm_special_date_executions_recipient_idx" ON "crm_special_date_executions" USING btree ("store_id","recipient_key");
