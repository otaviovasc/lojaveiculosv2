ALTER TYPE "finance_auto_entry_event"
  ADD VALUE IF NOT EXISTS 'transfer_documentation_charged';
ALTER TYPE "finance_auto_entry_event"
  ADD VALUE IF NOT EXISTS 'consortium_sold';

DO $$
BEGIN
  CREATE TYPE "finance_auto_entry_rule_resolution" AS ENUM (
    'additive', 'seller_override'
  );
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$
BEGIN
  CREATE TYPE "finance_auto_entry_recipient_kind" AS ENUM (
    'event_seller', 'fixed_user', 'none'
  );
EXCEPTION WHEN duplicate_object THEN null;
END $$;

ALTER TABLE "finance_auto_entry_rules"
  ADD COLUMN IF NOT EXISTS "conditions" jsonb DEFAULT '{}'::jsonb NOT NULL,
  ADD COLUMN IF NOT EXISTS "family" varchar(191),
  ADD COLUMN IF NOT EXISTS "recipient_kind"
    "finance_auto_entry_recipient_kind" DEFAULT 'event_seller' NOT NULL,
  ADD COLUMN IF NOT EXISTS "recipient_user_id" uuid REFERENCES "users"("id"),
  ADD COLUMN IF NOT EXISTS "resolution"
    "finance_auto_entry_rule_resolution" DEFAULT 'additive' NOT NULL,
  ADD COLUMN IF NOT EXISTS "rule_key" varchar(191);

ALTER TABLE "finance_auto_entry_rules"
  DROP CONSTRAINT IF EXISTS "finance_auto_entry_rules_calculation_valid",
  DROP CONSTRAINT IF EXISTS "finance_auto_entry_rules_event_basis_valid",
  DROP CONSTRAINT IF EXISTS "finance_auto_entry_rules_conditions_valid",
  DROP CONSTRAINT IF EXISTS "finance_auto_entry_rules_recipient_valid",
  DROP CONSTRAINT IF EXISTS "finance_auto_entry_rules_override_family_valid";

ALTER TABLE "finance_auto_entry_rules"
  ADD CONSTRAINT "finance_auto_entry_rules_calculation_valid" CHECK (
    ("calculation" ->> 'kind' = 'fixed'
      AND jsonb_typeof("calculation" -> 'amountCents') = 'number'
      AND ("calculation" ->> 'amountCents')::numeric
        = trunc(("calculation" ->> 'amountCents')::numeric)
      AND ("calculation" ->> 'amountCents')::numeric
        BETWEEN 1 AND 2147483647)
    OR
    ("calculation" ->> 'kind' = 'percentage'
      AND jsonb_typeof("calculation" -> 'basisPoints') = 'number'
      AND ("calculation" ->> 'basisPoints')::numeric
        = trunc(("calculation" ->> 'basisPoints')::numeric)
      AND ("calculation" ->> 'basisPoints')::numeric BETWEEN 1 AND 10000
      AND "calculation" ->> 'basis' IN (
        'sale', 'commission', 'financing', 'premium', 'insurance_commission',
        'documentation', 'consortium'
      ))
    OR
    ("calculation" ->> 'kind' = 'rate_ppm'
      AND jsonb_typeof("calculation" -> 'ratePpm') = 'number'
      AND ("calculation" ->> 'ratePpm')::numeric
        = trunc(("calculation" ->> 'ratePpm')::numeric)
      AND ("calculation" ->> 'ratePpm')::numeric BETWEEN 1 AND 1000000
      AND "calculation" ->> 'basis' IN (
        'sale', 'commission', 'financing', 'premium', 'insurance_commission',
        'documentation', 'consortium'
      ))
  ),
  ADD CONSTRAINT "finance_auto_entry_rules_event_basis_valid" CHECK (
    "calculation" ->> 'kind' = 'fixed'
    OR ("event" = 'vehicle_sale_closed'
      AND "calculation" ->> 'basis' IN ('sale', 'commission'))
    OR ("event" = 'financing_approved'
      AND "calculation" ->> 'basis' = 'financing')
    OR ("event" = 'insurance_issued'
      AND "calculation" ->> 'basis' IN ('premium', 'insurance_commission'))
    OR ("event" = 'transfer_documentation_charged'
      AND "calculation" ->> 'basis' = 'documentation')
    OR ("event" = 'consortium_sold'
      AND "calculation" ->> 'basis' = 'consortium')
  ),
  ADD CONSTRAINT "finance_auto_entry_rules_conditions_valid"
    CHECK (jsonb_typeof("conditions") = 'object'),
  ADD CONSTRAINT "finance_auto_entry_rules_recipient_valid" CHECK (
    ("recipient_kind" = 'fixed_user' AND "recipient_user_id" IS NOT NULL)
    OR ("recipient_kind" <> 'fixed_user' AND "recipient_user_id" IS NULL)
  ),
  ADD CONSTRAINT "finance_auto_entry_rules_override_family_valid"
    CHECK ("resolution" <> 'seller_override' OR "family" IS NOT NULL);

CREATE UNIQUE INDEX IF NOT EXISTS
  "finance_auto_entry_rules_scope_rule_key_unique"
  ON "finance_auto_entry_rules" (
    "tenant_id",
    "store_id",
    "rule_key",
    coalesce("seller_user_id", '00000000-0000-0000-0000-000000000000'::uuid)
  )
  WHERE "rule_key" IS NOT NULL;
