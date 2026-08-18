CREATE TABLE "crm_external_bot_internal_effects" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "updated_at" timestamptz DEFAULT now() NOT NULL,
  "command_id" uuid NOT NULL,
  "effect_type" varchar(120) NOT NULL,
  "idempotency_key" varchar(191) NOT NULL,
  "result" jsonb DEFAULT '{}'::jsonb NOT NULL,
  "store_id" uuid NOT NULL,
  "tenant_id" uuid NOT NULL,
  CONSTRAINT "crm_external_bot_internal_effects_command_fk"
    FOREIGN KEY ("command_id") REFERENCES "crm_external_bot_action_commands"("id"),
  CONSTRAINT "crm_external_bot_internal_effects_store_fk"
    FOREIGN KEY ("store_id") REFERENCES "stores"("id"),
  CONSTRAINT "crm_external_bot_internal_effects_tenant_fk"
    FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id"),
  CONSTRAINT "crm_external_bot_internal_effects_store_tenant_fk"
    FOREIGN KEY ("store_id", "tenant_id") REFERENCES "stores"("id", "tenant_id"),
  CONSTRAINT "crm_external_bot_internal_effects_scoped_command_fk"
    FOREIGN KEY ("tenant_id", "store_id", "command_id")
      REFERENCES "crm_external_bot_action_commands"("tenant_id", "store_id", "id")
);
CREATE UNIQUE INDEX "crm_external_bot_internal_effects_command_unique"
  ON "crm_external_bot_internal_effects" ("tenant_id", "store_id", "command_id");
CREATE UNIQUE INDEX "crm_external_bot_internal_effects_idempotency_unique"
  ON "crm_external_bot_internal_effects" ("tenant_id", "store_id", "idempotency_key");

CREATE TABLE "crm_tasks" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "updated_at" timestamptz DEFAULT now() NOT NULL,
  "command_id" uuid NOT NULL,
  "contact_id" uuid NOT NULL,
  "cycle_id" uuid NOT NULL,
  "due_at" timestamptz,
  "opportunity_id" uuid,
  "state" varchar(24) DEFAULT 'open' NOT NULL,
  "store_id" uuid NOT NULL,
  "tenant_id" uuid NOT NULL,
  "thread_id" uuid NOT NULL,
  "title" varchar(300) NOT NULL,
  CONSTRAINT "crm_tasks_state_check" CHECK ("state" IN ('open','completed','cancelled')),
  CONSTRAINT "crm_tasks_command_fk" FOREIGN KEY ("command_id") REFERENCES "crm_external_bot_action_commands"("id"),
  CONSTRAINT "crm_tasks_scoped_command_fk" FOREIGN KEY ("tenant_id", "store_id", "command_id") REFERENCES "crm_external_bot_action_commands"("tenant_id", "store_id", "id"),
  CONSTRAINT "crm_tasks_contact_fk" FOREIGN KEY ("contact_id") REFERENCES "contacts"("id"),
  CONSTRAINT "crm_tasks_cycle_fk" FOREIGN KEY ("cycle_id") REFERENCES "crm_conversation_cycles"("id"),
  CONSTRAINT "crm_tasks_opportunity_fk" FOREIGN KEY ("opportunity_id") REFERENCES "opportunities"("id"),
  CONSTRAINT "crm_tasks_thread_fk" FOREIGN KEY ("thread_id") REFERENCES "crm_conversation_threads"("id"),
  CONSTRAINT "crm_tasks_store_fk" FOREIGN KEY ("store_id") REFERENCES "stores"("id"),
  CONSTRAINT "crm_tasks_tenant_fk" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id"),
  CONSTRAINT "crm_tasks_store_tenant_fk" FOREIGN KEY ("store_id", "tenant_id") REFERENCES "stores"("id", "tenant_id"),
  CONSTRAINT "crm_tasks_scoped_contact_fk" FOREIGN KEY ("tenant_id", "store_id", "contact_id") REFERENCES "contacts"("tenant_id", "store_id", "id"),
  CONSTRAINT "crm_tasks_scoped_thread_fk" FOREIGN KEY ("tenant_id", "store_id", "thread_id") REFERENCES "crm_conversation_threads"("tenant_id", "store_id", "id"),
  CONSTRAINT "crm_tasks_semantic_cycle_fk" FOREIGN KEY ("tenant_id", "store_id", "cycle_id", "thread_id") REFERENCES "crm_conversation_cycles"("tenant_id", "store_id", "id", "thread_id"),
  CONSTRAINT "crm_tasks_scoped_opportunity_fk" FOREIGN KEY ("tenant_id", "store_id", "opportunity_id") REFERENCES "opportunities"("tenant_id", "store_id", "id")
);
CREATE UNIQUE INDEX "crm_tasks_command_unique" ON "crm_tasks" ("tenant_id", "store_id", "command_id");
CREATE UNIQUE INDEX "crm_tasks_scope_id_unique" ON "crm_tasks" ("tenant_id", "store_id", "id");
CREATE INDEX "crm_tasks_schedule_idx" ON "crm_tasks" ("store_id", "state", "due_at");

CREATE TABLE "crm_appointments" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "updated_at" timestamptz DEFAULT now() NOT NULL,
  "command_id" uuid NOT NULL,
  "contact_id" uuid NOT NULL,
  "cycle_id" uuid NOT NULL,
  "opportunity_id" uuid,
  "starts_at" timestamptz NOT NULL,
  "state" varchar(24) DEFAULT 'scheduled' NOT NULL,
  "store_id" uuid NOT NULL,
  "summary" text,
  "tenant_id" uuid NOT NULL,
  "thread_id" uuid NOT NULL,
  CONSTRAINT "crm_appointments_state_check" CHECK ("state" IN ('scheduled','completed','cancelled','no_show')),
  CONSTRAINT "crm_appointments_command_fk" FOREIGN KEY ("command_id") REFERENCES "crm_external_bot_action_commands"("id"),
  CONSTRAINT "crm_appointments_scoped_command_fk" FOREIGN KEY ("tenant_id", "store_id", "command_id") REFERENCES "crm_external_bot_action_commands"("tenant_id", "store_id", "id"),
  CONSTRAINT "crm_appointments_contact_fk" FOREIGN KEY ("contact_id") REFERENCES "contacts"("id"),
  CONSTRAINT "crm_appointments_cycle_fk" FOREIGN KEY ("cycle_id") REFERENCES "crm_conversation_cycles"("id"),
  CONSTRAINT "crm_appointments_opportunity_fk" FOREIGN KEY ("opportunity_id") REFERENCES "opportunities"("id"),
  CONSTRAINT "crm_appointments_thread_fk" FOREIGN KEY ("thread_id") REFERENCES "crm_conversation_threads"("id"),
  CONSTRAINT "crm_appointments_store_fk" FOREIGN KEY ("store_id") REFERENCES "stores"("id"),
  CONSTRAINT "crm_appointments_tenant_fk" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id"),
  CONSTRAINT "crm_appointments_store_tenant_fk" FOREIGN KEY ("store_id", "tenant_id") REFERENCES "stores"("id", "tenant_id"),
  CONSTRAINT "crm_appointments_scoped_contact_fk" FOREIGN KEY ("tenant_id", "store_id", "contact_id") REFERENCES "contacts"("tenant_id", "store_id", "id"),
  CONSTRAINT "crm_appointments_scoped_thread_fk" FOREIGN KEY ("tenant_id", "store_id", "thread_id") REFERENCES "crm_conversation_threads"("tenant_id", "store_id", "id"),
  CONSTRAINT "crm_appointments_semantic_cycle_fk" FOREIGN KEY ("tenant_id", "store_id", "cycle_id", "thread_id") REFERENCES "crm_conversation_cycles"("tenant_id", "store_id", "id", "thread_id"),
  CONSTRAINT "crm_appointments_scoped_opportunity_fk" FOREIGN KEY ("tenant_id", "store_id", "opportunity_id") REFERENCES "opportunities"("tenant_id", "store_id", "id")
);
CREATE UNIQUE INDEX "crm_appointments_command_unique" ON "crm_appointments" ("tenant_id", "store_id", "command_id");
CREATE UNIQUE INDEX "crm_appointments_scope_id_unique" ON "crm_appointments" ("tenant_id", "store_id", "id");
CREATE INDEX "crm_appointments_schedule_idx" ON "crm_appointments" ("store_id", "state", "starts_at");
