DO $$
BEGIN
  CREATE TYPE "automation_run_status" AS ENUM (
    'awaiting_approval', 'approved', 'rejected', 'cancelled'
  );
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$
BEGIN
  CREATE TYPE "automation_step_status" AS ENUM (
    'awaiting_approval', 'approved', 'rejected', 'cancelled'
  );
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$
BEGIN
  CREATE TYPE "automation_approval_status" AS ENUM (
    'pending', 'approved', 'rejected', 'cancelled'
  );
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$
BEGIN
  CREATE TYPE "automation_step_kind" AS ENUM ('read_only_preview');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$
BEGIN
  CREATE TYPE "automation_risk_level" AS ENUM ('low');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS "automation_runs" (
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  "context" jsonb DEFAULT '{}'::jsonb NOT NULL,
  "created_by_actor_id" varchar(191) NOT NULL,
  "execution_enabled" boolean DEFAULT false NOT NULL,
  "objective" text NOT NULL,
  "status" "automation_run_status" DEFAULT 'awaiting_approval' NOT NULL,
  "store_id" uuid NOT NULL REFERENCES "stores"("id"),
  "tenant_id" uuid NOT NULL REFERENCES "tenants"("id"),
  "version" integer DEFAULT 1 NOT NULL,
  CONSTRAINT "automation_runs_execution_disabled" CHECK ("execution_enabled" = false),
  CONSTRAINT "automation_runs_version_positive" CHECK ("version" > 0)
);

CREATE TABLE IF NOT EXISTS "automation_steps" (
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  "execution_enabled" boolean DEFAULT false NOT NULL,
  "kind" "automation_step_kind" DEFAULT 'read_only_preview' NOT NULL,
  "position" integer NOT NULL,
  "risk" "automation_risk_level" DEFAULT 'low' NOT NULL,
  "run_id" uuid NOT NULL REFERENCES "automation_runs"("id") ON DELETE CASCADE,
  "status" "automation_step_status" DEFAULT 'awaiting_approval' NOT NULL,
  "store_id" uuid NOT NULL REFERENCES "stores"("id"),
  "summary" text NOT NULL,
  "tenant_id" uuid NOT NULL REFERENCES "tenants"("id"),
  "title" varchar(191) NOT NULL,
  "version" integer DEFAULT 1 NOT NULL,
  CONSTRAINT "automation_steps_execution_disabled" CHECK ("execution_enabled" = false),
  CONSTRAINT "automation_steps_position_positive" CHECK ("position" > 0),
  CONSTRAINT "automation_steps_version_positive" CHECK ("version" > 0)
);

CREATE TABLE IF NOT EXISTS "automation_approvals" (
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  "decided_at" timestamp with time zone,
  "decided_by_actor_id" varchar(191),
  "proposal_digest" varchar(64) NOT NULL,
  "run_id" uuid NOT NULL REFERENCES "automation_runs"("id") ON DELETE CASCADE,
  "status" "automation_approval_status" DEFAULT 'pending' NOT NULL,
  "step_id" uuid NOT NULL REFERENCES "automation_steps"("id") ON DELETE CASCADE,
  "store_id" uuid NOT NULL REFERENCES "stores"("id"),
  "tenant_id" uuid NOT NULL REFERENCES "tenants"("id"),
  "version" integer DEFAULT 1 NOT NULL,
  CONSTRAINT "automation_approvals_version_positive" CHECK ("version" > 0)
);

CREATE INDEX IF NOT EXISTS "automation_runs_scope_created_idx"
  ON "automation_runs" ("tenant_id", "store_id", "created_at");
CREATE INDEX IF NOT EXISTS "automation_runs_store_status_idx"
  ON "automation_runs" ("store_id", "status");
CREATE UNIQUE INDEX IF NOT EXISTS "automation_steps_run_position_unique"
  ON "automation_steps" ("run_id", "position");
CREATE INDEX IF NOT EXISTS "automation_steps_scope_run_idx"
  ON "automation_steps" ("tenant_id", "store_id", "run_id");
CREATE UNIQUE INDEX IF NOT EXISTS "automation_approvals_step_unique"
  ON "automation_approvals" ("step_id");
CREATE INDEX IF NOT EXISTS "automation_approvals_scope_run_idx"
  ON "automation_approvals" ("tenant_id", "store_id", "run_id");

DO $$
BEGIN
  ALTER TABLE "automation_runs"
    ADD CONSTRAINT "automation_runs_id_scope_unique"
    UNIQUE ("id", "tenant_id", "store_id");
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$
BEGIN
  ALTER TABLE "automation_steps"
    ADD CONSTRAINT "automation_steps_id_run_scope_unique"
    UNIQUE ("id", "run_id", "tenant_id", "store_id");
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$
BEGIN
  ALTER TABLE "automation_steps"
    ADD CONSTRAINT "automation_steps_run_scope_fk"
    FOREIGN KEY ("run_id", "tenant_id", "store_id")
    REFERENCES "automation_runs" ("id", "tenant_id", "store_id")
    ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$
BEGIN
  ALTER TABLE "automation_approvals"
    ADD CONSTRAINT "automation_approvals_step_run_scope_fk"
    FOREIGN KEY ("step_id", "run_id", "tenant_id", "store_id")
    REFERENCES "automation_steps" ("id", "run_id", "tenant_id", "store_id")
    ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$
BEGIN
  ALTER TABLE "automation_approvals"
    ADD CONSTRAINT "automation_approvals_proposal_digest_sha256"
    CHECK ("proposal_digest" ~ '^[0-9a-f]{64}$');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$
BEGIN
  ALTER TABLE "automation_approvals"
    ADD CONSTRAINT "automation_approvals_decision_actor_consistent"
    CHECK (
      ("status" = 'pending' AND "decided_at" IS NULL AND "decided_by_actor_id" IS NULL)
      OR
      ("status" <> 'pending' AND "decided_at" IS NOT NULL AND "decided_by_actor_id" IS NOT NULL)
    );
EXCEPTION WHEN duplicate_object THEN null;
END $$;
