ALTER TYPE "public"."workflow_provider" ADD VALUE IF NOT EXISTS 'external_bot';--> statement-breakpoint
ALTER TABLE "bot_integration_grants" ADD COLUMN IF NOT EXISTS "token_digest" varchar(128);--> statement-breakpoint
ALTER TABLE "bot_integration_grants" ADD COLUMN IF NOT EXISTS "authorized_request_digest" varchar(128);--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "bot_integration_grants_token_digest_unique" ON "bot_integration_grants" ("token_digest") WHERE "token_digest" IS NOT NULL;--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "crm_external_bot_event_outbox" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "tenant_id" uuid NOT NULL REFERENCES "tenants"("id"),
  "store_id" uuid NOT NULL REFERENCES "stores"("id"),
  "integration_id" uuid NOT NULL,
  "provider_connection_id" uuid NOT NULL REFERENCES "provider_connections"("id"),
  "thread_id" uuid NOT NULL REFERENCES "conversation_threads"("id"),
  "provider" varchar(24) NOT NULL,
  "action_class" varchar(24) NOT NULL,
  "model_version" varchar(120) NOT NULL,
  "event_type" varchar(120) NOT NULL,
  "payload" jsonb DEFAULT '{}'::jsonb NOT NULL,
  "grant_token" text NOT NULL,
  "authorized_request_digest" varchar(128) NOT NULL,
  "grant_expires_at" timestamptz NOT NULL,
  "state" varchar(24) DEFAULT 'pending' NOT NULL,
  "attempt_count" integer DEFAULT 0 NOT NULL,
  "next_attempt_at" timestamptz DEFAULT now() NOT NULL,
  "last_error_code" varchar(120),
  "occurred_at" timestamptz DEFAULT now() NOT NULL,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "updated_at" timestamptz DEFAULT now() NOT NULL,
  CONSTRAINT "crm_external_bot_event_outbox_state_check" CHECK ("state" IN ('pending','processing','delivered','dead_letter')),
  CONSTRAINT "crm_external_bot_event_outbox_scope_fk" FOREIGN KEY ("store_id","tenant_id") REFERENCES "stores"("id","tenant_id"),
  CONSTRAINT "crm_external_bot_event_outbox_connection_fk" FOREIGN KEY ("tenant_id","store_id","provider_connection_id") REFERENCES "provider_connections"("tenant_id","store_id","id"),
  CONSTRAINT "crm_external_bot_event_outbox_thread_fk" FOREIGN KEY ("tenant_id","store_id","thread_id") REFERENCES "conversation_threads"("tenant_id","store_id","id")
);
CREATE INDEX IF NOT EXISTS "crm_external_bot_event_outbox_claim_idx" ON "crm_external_bot_event_outbox" ("state","next_attempt_at");

CREATE TABLE IF NOT EXISTS "crm_external_bot_kill_switches" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "level" varchar(32) NOT NULL,
  "scope_value" varchar(191),
  "action_type" varchar(120),
  "enabled" boolean DEFAULT true NOT NULL,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "updated_at" timestamptz DEFAULT now() NOT NULL,
  CONSTRAINT "crm_external_bot_kill_switch_level_check" CHECK ("level" IN ('global','tenant','store','integration','connection','thread','provider','action','action_class','pii_export','model_version'))
);
CREATE INDEX IF NOT EXISTS "crm_external_bot_kill_switch_lookup_idx" ON "crm_external_bot_kill_switches" ("enabled","level","scope_value","action_type");

CREATE TABLE IF NOT EXISTS "crm_external_bot_proposals" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "tenant_id" uuid NOT NULL REFERENCES "tenants"("id"),
  "store_id" uuid NOT NULL REFERENCES "stores"("id"),
  "command_id" uuid NOT NULL REFERENCES "bot_action_commands"("id"),
  "action_type" varchar(120) NOT NULL,
  "payload" jsonb NOT NULL,
  "idempotency_key" varchar(191) NOT NULL,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "updated_at" timestamptz DEFAULT now() NOT NULL,
  CONSTRAINT "crm_external_bot_proposals_scope_fk" FOREIGN KEY ("store_id","tenant_id") REFERENCES "stores"("id","tenant_id"),
  CONSTRAINT "crm_external_bot_proposals_command_fk" FOREIGN KEY ("tenant_id","store_id","command_id") REFERENCES "bot_action_commands"("tenant_id","store_id","id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "crm_external_bot_proposals_idempotency_unique" ON "crm_external_bot_proposals" ("tenant_id","store_id","idempotency_key");
