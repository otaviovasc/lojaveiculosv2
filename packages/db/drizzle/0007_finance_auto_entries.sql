DO $$
BEGIN
  CREATE TYPE "finance_auto_entry_event" AS ENUM (
    'vehicle_sale_closed', 'financing_approved', 'insurance_issued'
  );
EXCEPTION WHEN duplicate_object THEN null;
END $$;

ALTER TYPE "finance_link_target"
  ADD VALUE IF NOT EXISTS 'vehicle_listing';

DO $$
BEGIN
  CREATE TYPE "finance_auto_entry_rule_status" AS ENUM ('active', 'inactive');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS "finance_auto_entry_rules" (
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  "calculation" jsonb NOT NULL,
  "category" varchar(120),
  "event" "finance_auto_entry_event" NOT NULL,
  "metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
  "name" varchar(191),
  "output_type" "finance_entry_type" NOT NULL,
  "priority" integer DEFAULT 0 NOT NULL,
  "seller_user_id" uuid REFERENCES "users"("id"),
  "status" "finance_auto_entry_rule_status" DEFAULT 'active' NOT NULL,
  "store_id" uuid NOT NULL REFERENCES "stores"("id"),
  "tenant_id" uuid NOT NULL REFERENCES "tenants"("id"),
  "timing" jsonb NOT NULL,
  CONSTRAINT "finance_auto_entry_rules_priority_range"
    CHECK ("priority" BETWEEN 0 AND 100),
  CONSTRAINT "finance_auto_entry_rules_calculation_valid" CHECK (
    ("calculation" ->> 'kind' = 'fixed'
      AND jsonb_typeof("calculation" -> 'amountCents') = 'number'
      AND ("calculation" ->> 'amountCents')::numeric
        = trunc(("calculation" ->> 'amountCents')::numeric)
      AND ("calculation" ->> 'amountCents')::numeric
        BETWEEN 1 AND 2147483647)
    OR
    ("calculation" ->> 'kind' = 'percentage'
      AND jsonb_typeof("calculation" -> 'basisPoints') = 'number'
      AND ("calculation" ->> 'basisPoints')::integer BETWEEN 1 AND 10000
      AND "calculation" ->> 'basis' IN ('sale', 'financing', 'premium'))
  ),
  CONSTRAINT "finance_auto_entry_rules_event_basis_valid" CHECK (
    "calculation" ->> 'kind' = 'fixed'
    OR ("event" = 'vehicle_sale_closed'
      AND "calculation" ->> 'basis' = 'sale')
    OR ("event" = 'financing_approved'
      AND "calculation" ->> 'basis' = 'financing')
    OR ("event" = 'insurance_issued'
      AND "calculation" ->> 'basis' = 'premium')
  ),
  CONSTRAINT "finance_auto_entry_rules_sale_output_valid" CHECK (
    "event" <> 'vehicle_sale_closed' OR "output_type" = 'commission'
  ),
  CONSTRAINT "finance_auto_entry_rules_timing_valid" CHECK (
    "timing" ->> 'kind' = 'same_day'
    OR ("timing" ->> 'kind' = 'days_after'
      AND jsonb_typeof("timing" -> 'days') = 'number'
      AND ("timing" ->> 'days')::integer BETWEEN 1 AND 365)
    OR ("timing" ->> 'kind' IN ('day_of_month', 'next_month_day')
      AND jsonb_typeof("timing" -> 'day') = 'number'
      AND ("timing" ->> 'day')::integer BETWEEN 1 AND 31)
  )
);

CREATE TABLE IF NOT EXISTS "finance_auto_entry_executions" (
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  "calculation_snapshot" jsonb NOT NULL,
  "finance_entry_id" uuid NOT NULL REFERENCES "finance_entries"("id"),
  "metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
  "rule_id" uuid NOT NULL REFERENCES "finance_auto_entry_rules"("id"),
  "source_id" uuid NOT NULL,
  "source_revision" integer NOT NULL,
  "source_type" "finance_auto_entry_event" NOT NULL,
  "store_id" uuid NOT NULL REFERENCES "stores"("id"),
  "tenant_id" uuid NOT NULL REFERENCES "tenants"("id"),
  CONSTRAINT "finance_auto_entry_executions_source_revision_positive"
    CHECK ("source_revision" > 0)
);

CREATE INDEX IF NOT EXISTS "finance_auto_entry_rules_scope_event_idx"
  ON "finance_auto_entry_rules" ("tenant_id", "store_id", "event", "status");
CREATE INDEX IF NOT EXISTS "finance_auto_entry_rules_seller_idx"
  ON "finance_auto_entry_rules" ("seller_user_id");
CREATE UNIQUE INDEX IF NOT EXISTS "finance_auto_entry_executions_idempotency_unique"
  ON "finance_auto_entry_executions" (
    "store_id", "rule_id", "source_type", "source_id", "source_revision"
  );
CREATE INDEX IF NOT EXISTS "finance_auto_entry_executions_scope_source_idx"
  ON "finance_auto_entry_executions" (
    "tenant_id", "store_id", "source_type", "source_id"
  );
CREATE INDEX IF NOT EXISTS "finance_auto_entry_executions_entry_idx"
  ON "finance_auto_entry_executions" ("finance_entry_id");
