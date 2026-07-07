CREATE TYPE "public"."crm_whatsapp_campaign_status" AS ENUM (
  'cancelled',
  'completed',
  'draft',
  'paused',
  'scheduled'
);

CREATE TYPE "public"."crm_whatsapp_campaign_recipient_status" AS ENUM (
  'cancelled',
  'failed',
  'pending',
  'replied',
  'secondary_scheduled',
  'secondary_sent',
  'sent'
);

CREATE TABLE "crm_whatsapp_campaigns" (
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  "content" text NOT NULL,
  "created_by_user_id" uuid,
  "failed_count" integer DEFAULT 0 NOT NULL,
  "initial_tag_id" uuid,
  "interval_minutes" integer DEFAULT 1 NOT NULL,
  "media_type" varchar(120),
  "media_url" text,
  "metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
  "name" varchar(191) NOT NULL,
  "replied_count" integer DEFAULT 0 NOT NULL,
  "reply_tag_id" uuid,
  "scheduled_count" integer DEFAULT 0 NOT NULL,
  "scheduled_end_at" timestamp with time zone NOT NULL,
  "scheduled_start_at" timestamp with time zone NOT NULL,
  "secondary_content" text,
  "secondary_delay_minutes" integer DEFAULT 1 NOT NULL,
  "secondary_sent_count" integer DEFAULT 0 NOT NULL,
  "selected_connection_id" uuid,
  "sent_count" integer DEFAULT 0 NOT NULL,
  "status" "crm_whatsapp_campaign_status" DEFAULT 'draft' NOT NULL,
  "store_id" uuid NOT NULL,
  "tenant_id" uuid NOT NULL,
  "total_recipients" integer DEFAULT 0 NOT NULL,
  CONSTRAINT "crm_whatsapp_campaigns_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "crm_whatsapp_campaigns"
  ADD CONSTRAINT "crm_whatsapp_campaigns_created_by_user_id_users_id_fk"
  FOREIGN KEY ("created_by_user_id") REFERENCES "users"("id");
ALTER TABLE "crm_whatsapp_campaigns"
  ADD CONSTRAINT "crm_whatsapp_campaigns_initial_tag_id_crm_tags_id_fk"
  FOREIGN KEY ("initial_tag_id") REFERENCES "crm_tags"("id");
ALTER TABLE "crm_whatsapp_campaigns"
  ADD CONSTRAINT "crm_whatsapp_campaigns_reply_tag_id_crm_tags_id_fk"
  FOREIGN KEY ("reply_tag_id") REFERENCES "crm_tags"("id");
ALTER TABLE "crm_whatsapp_campaigns"
  ADD CONSTRAINT "crm_whatsapp_campaigns_selected_connection_id_crm_connections_id_fk"
  FOREIGN KEY ("selected_connection_id") REFERENCES "crm_connections"("id");
ALTER TABLE "crm_whatsapp_campaigns"
  ADD CONSTRAINT "crm_whatsapp_campaigns_store_id_stores_id_fk"
  FOREIGN KEY ("store_id") REFERENCES "stores"("id");
ALTER TABLE "crm_whatsapp_campaigns"
  ADD CONSTRAINT "crm_whatsapp_campaigns_tenant_id_tenants_id_fk"
  FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id");

CREATE TABLE "crm_whatsapp_campaign_recipients" (
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  "campaign_id" uuid NOT NULL,
  "connection_id" uuid NOT NULL,
  "error_message" text,
  "initial_scheduled_message_id" uuid,
  "initial_sent_at" timestamp with time zone,
  "lead_id" uuid,
  "phone" varchar(40) NOT NULL,
  "reply_content_preview" text,
  "reply_message_id" uuid,
  "reply_received_at" timestamp with time zone,
  "secondary_scheduled_message_id" uuid,
  "secondary_sent_at" timestamp with time zone,
  "sent_message_id" uuid,
  "sequence" integer NOT NULL,
  "session_id" uuid NOT NULL,
  "status" "crm_whatsapp_campaign_recipient_status" DEFAULT 'pending' NOT NULL,
  "store_id" uuid NOT NULL,
  "tenant_id" uuid NOT NULL,
  "variables" jsonb DEFAULT '{}'::jsonb NOT NULL,
  CONSTRAINT "crm_whatsapp_campaign_recipients_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "crm_whatsapp_campaign_recipients"
  ADD CONSTRAINT "crm_whatsapp_campaign_recipients_campaign_id_campaigns_id_fk"
  FOREIGN KEY ("campaign_id") REFERENCES "crm_whatsapp_campaigns"("id");
ALTER TABLE "crm_whatsapp_campaign_recipients"
  ADD CONSTRAINT "crm_whatsapp_campaign_recipients_connection_id_connections_id_fk"
  FOREIGN KEY ("connection_id") REFERENCES "crm_connections"("id");
ALTER TABLE "crm_whatsapp_campaign_recipients"
  ADD CONSTRAINT "crm_whatsapp_campaign_recipients_lead_id_leads_id_fk"
  FOREIGN KEY ("lead_id") REFERENCES "leads"("id");
ALTER TABLE "crm_whatsapp_campaign_recipients"
  ADD CONSTRAINT "crm_whatsapp_campaign_recipients_session_id_sessions_id_fk"
  FOREIGN KEY ("session_id") REFERENCES "crm_whatsapp_sessions"("id");
ALTER TABLE "crm_whatsapp_campaign_recipients"
  ADD CONSTRAINT "crm_whatsapp_campaign_recipients_store_id_stores_id_fk"
  FOREIGN KEY ("store_id") REFERENCES "stores"("id");
ALTER TABLE "crm_whatsapp_campaign_recipients"
  ADD CONSTRAINT "crm_whatsapp_campaign_recipients_tenant_id_tenants_id_fk"
  FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id");

ALTER TABLE "crm_whatsapp_scheduled_messages"
  ADD COLUMN "campaign_id" uuid,
  ADD COLUMN "campaign_message_type" varchar(40),
  ADD COLUMN "campaign_recipient_key" varchar(191),
  ADD COLUMN "campaign_sequence" integer;

ALTER TABLE "crm_whatsapp_scheduled_messages"
  ADD CONSTRAINT "crm_whatsapp_scheduled_messages_campaign_id_crm_whatsapp_campaigns_id_fk"
  FOREIGN KEY ("campaign_id") REFERENCES "crm_whatsapp_campaigns"("id");

CREATE INDEX "crm_whatsapp_campaigns_store_status_idx"
  ON "crm_whatsapp_campaigns" ("store_id", "status", "created_at");
CREATE INDEX "crm_whatsapp_campaigns_store_start_idx"
  ON "crm_whatsapp_campaigns" ("store_id", "scheduled_start_at");
CREATE UNIQUE INDEX "crm_whatsapp_campaign_recipients_campaign_session_unique"
  ON "crm_whatsapp_campaign_recipients" ("campaign_id", "session_id");
CREATE INDEX "crm_whatsapp_campaign_recipients_campaign_idx"
  ON "crm_whatsapp_campaign_recipients" ("campaign_id", "sequence");
CREATE INDEX "crm_whatsapp_campaign_recipients_session_status_idx"
  ON "crm_whatsapp_campaign_recipients" ("session_id", "status", "updated_at");
CREATE INDEX "crm_whatsapp_scheduled_messages_campaign_idx"
  ON "crm_whatsapp_scheduled_messages" ("campaign_id", "campaign_sequence");
