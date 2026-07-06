DO $$
BEGIN
  CREATE TYPE "crm_pipeline_stage_status" AS ENUM ('open', 'won', 'lost');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS "crm_pipelines" (
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  "deleted_at" timestamp with time zone,
  "is_deleted" boolean DEFAULT false NOT NULL,
  "description" text DEFAULT '' NOT NULL,
  "is_default" boolean DEFAULT false NOT NULL,
  "name" varchar(120) NOT NULL,
  "rotation_active" boolean DEFAULT false NOT NULL,
  "store_id" uuid NOT NULL REFERENCES "stores"("id"),
  "tenant_id" uuid NOT NULL REFERENCES "tenants"("id")
);

CREATE TABLE IF NOT EXISTS "crm_pipeline_stages" (
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  "deleted_at" timestamp with time zone,
  "is_deleted" boolean DEFAULT false NOT NULL,
  "color" varchar(16) DEFAULT '#64748b' NOT NULL,
  "is_system" boolean DEFAULT false NOT NULL,
  "lead_status" varchar(40) DEFAULT 'new' NOT NULL,
  "name" varchar(120) NOT NULL,
  "pipeline_id" uuid NOT NULL REFERENCES "crm_pipelines"("id"),
  "sla_days" integer,
  "sort_order" integer DEFAULT 0 NOT NULL,
  "status" "crm_pipeline_stage_status" DEFAULT 'open' NOT NULL,
  "store_id" uuid NOT NULL REFERENCES "stores"("id"),
  "tenant_id" uuid NOT NULL REFERENCES "tenants"("id")
);

ALTER TABLE "leads"
  ADD COLUMN IF NOT EXISTS "pipeline_id" uuid;

ALTER TABLE "leads"
  ADD COLUMN IF NOT EXISTS "pipeline_stage_id" uuid;

DO $$
BEGIN
  ALTER TABLE "leads"
    ADD CONSTRAINT "leads_pipeline_id_crm_pipelines_id_fk"
    FOREIGN KEY ("pipeline_id") REFERENCES "crm_pipelines"("id");
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$
BEGIN
  ALTER TABLE "leads"
    ADD CONSTRAINT "leads_pipeline_stage_id_crm_pipeline_stages_id_fk"
    FOREIGN KEY ("pipeline_stage_id") REFERENCES "crm_pipeline_stages"("id");
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

CREATE INDEX IF NOT EXISTS "crm_pipelines_store_default_idx"
  ON "crm_pipelines" ("store_id", "is_default");

CREATE INDEX IF NOT EXISTS "crm_pipelines_tenant_id_idx"
  ON "crm_pipelines" ("tenant_id");

CREATE UNIQUE INDEX IF NOT EXISTS "crm_pipelines_store_name_unique"
  ON "crm_pipelines" ("store_id", "name");

CREATE INDEX IF NOT EXISTS "crm_pipeline_stages_pipeline_idx"
  ON "crm_pipeline_stages" ("pipeline_id", "sort_order");

CREATE INDEX IF NOT EXISTS "crm_pipeline_stages_store_idx"
  ON "crm_pipeline_stages" ("store_id");

CREATE INDEX IF NOT EXISTS "leads_pipeline_id_idx"
  ON "leads" ("pipeline_id");

CREATE INDEX IF NOT EXISTS "leads_pipeline_stage_id_idx"
  ON "leads" ("pipeline_stage_id");
