ALTER TYPE "billing_provider_reconciliation_kind"
  ADD VALUE IF NOT EXISTS 'subscription_cancellation';

ALTER TABLE "subscriptions" ADD COLUMN IF NOT EXISTS "store_id" uuid;
ALTER TABLE "billing_provider_reconciliations"
  ADD COLUMN IF NOT EXISTS "store_id" uuid;
ALTER TABLE "billing_provider_reconciliations"
  ADD COLUMN IF NOT EXISTS "target_provider_subscription_id" varchar(191);
DROP INDEX IF EXISTS "billing_provider_reconciliations_kind_subscription_unique";
CREATE UNIQUE INDEX IF NOT EXISTS "billing_provider_reconciliations_non_target_unique"
  ON "billing_provider_reconciliations" ("kind", "subscription_id")
  WHERE "target_provider_subscription_id" IS NULL;
CREATE UNIQUE INDEX IF NOT EXISTS "billing_provider_reconciliations_target_unique"
  ON "billing_provider_reconciliations" (
    "kind", "subscription_id", "target_provider_subscription_id"
  ) WHERE "target_provider_subscription_id" IS NOT NULL;
DO $$ BEGIN
  ALTER TABLE "billing_provider_reconciliations"
    ADD CONSTRAINT "billing_provider_reconciliations_target_shape_check"
    CHECK (
      (
        "kind"::text = 'subscription_cancellation' AND
        "target_provider_subscription_id" IS NOT NULL
      ) OR (
        "kind"::text <> 'subscription_cancellation' AND
        "target_provider_subscription_id" IS NULL
      )
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE "billing_plan_hires"
  DROP CONSTRAINT IF EXISTS "billing_plan_hires_effective_item_scope_fk";
ALTER TABLE "billing_addon_contracts"
  DROP CONSTRAINT IF EXISTS "billing_addon_contracts_item_scope_fk";
ALTER TABLE "billing_addon_contracts"
  DROP CONSTRAINT IF EXISTS "billing_addon_contracts_payment_scope_fk";

WITH payment_evidence AS (
  SELECT DISTINCT
    payment."id" AS "payment_id",
    hire."subscription_id",
    hire."store_id",
    hire."tenant_id"
  FROM "payments" payment
  JOIN "billing_plan_hires" hire
    ON hire."tenant_id" = payment."tenant_id"
   AND (
     payment."external_reference" = hire."id"::text OR
     (
       payment."provider_payment_id" IS NOT NULL AND
       payment."provider_payment_id" = hire."provider_payment_id"
     )
   )
  WHERE payment."subscription_id" IS NOT NULL
    AND payment."store_id" IS NULL
), unambiguous_payment AS (
  SELECT
    "payment_id",
    min("subscription_id"::text)::uuid AS "subscription_id",
    min("store_id"::text)::uuid AS "store_id",
    min("tenant_id"::text)::uuid AS "tenant_id"
  FROM payment_evidence
  GROUP BY "payment_id"
  HAVING count(DISTINCT ("subscription_id", "tenant_id", "store_id")) = 1
)
UPDATE "payments" payment
SET
  "subscription_id" = evidence."subscription_id",
  "store_id" = evidence."store_id",
  "updated_at" = now()
FROM unambiguous_payment evidence
WHERE payment."id" = evidence."payment_id"
  AND payment."tenant_id" = evidence."tenant_id";

WITH checkout_evidence AS (
  SELECT DISTINCT
    checkout."id" AS "checkout_id",
    hire."id" AS "hire_id",
    hire."subscription_id",
    hire."store_id",
    hire."tenant_id"
  FROM "billing_checkout_sessions" checkout
  JOIN "billing_plan_hires" hire
    ON hire."tenant_id" = checkout."tenant_id"
   AND (
     checkout."plan_hire_id" = hire."id" OR
     checkout."external_reference" = hire."id"::text
   )
  WHERE checkout."store_id" IS NULL
), unambiguous_checkout AS (
  SELECT
    "checkout_id",
    min("hire_id"::text)::uuid AS "hire_id",
    min("subscription_id"::text)::uuid AS "subscription_id",
    min("store_id"::text)::uuid AS "store_id",
    min("tenant_id"::text)::uuid AS "tenant_id"
  FROM checkout_evidence
  GROUP BY "checkout_id"
  HAVING count(DISTINCT ("hire_id", "subscription_id", "tenant_id", "store_id")) = 1
)
UPDATE "billing_checkout_sessions" checkout
SET
  "plan_hire_id" = evidence."hire_id",
  "subscription_id" = evidence."subscription_id",
  "store_id" = evidence."store_id",
  "updated_at" = now()
FROM unambiguous_checkout evidence
WHERE checkout."id" = evidence."checkout_id"
  AND checkout."tenant_id" = evidence."tenant_id";

WITH item_evidence AS (
  SELECT DISTINCT
    item."id" AS "item_id",
    scoped."store_id",
    scoped."tenant_id"
  FROM "subscription_items" item
  JOIN (
    SELECT "subscription_item_id" AS "item_id", "store_id", "tenant_id"
    FROM "billing_addon_contracts"
    UNION ALL
    SELECT "effective_subscription_item_id", "store_id", "tenant_id"
    FROM "billing_plan_hires"
    WHERE "effective_subscription_item_id" IS NOT NULL
  ) scoped
    ON scoped."item_id" = item."id"
   AND scoped."tenant_id" = item."tenant_id"
  WHERE item."store_id" IS NULL
), unambiguous_item AS (
  SELECT
    "item_id",
    min("store_id"::text)::uuid AS "store_id",
    min("tenant_id"::text)::uuid AS "tenant_id"
  FROM item_evidence
  GROUP BY "item_id"
  HAVING count(DISTINCT ("tenant_id", "store_id")) = 1
)
UPDATE "subscription_items" item
SET "store_id" = evidence."store_id", "updated_at" = now()
FROM unambiguous_item evidence
WHERE item."id" = evidence."item_id"
  AND item."tenant_id" = evidence."tenant_id";

DO $$
DECLARE
  unresolved_checkouts integer;
  unresolved_items integer;
  unresolved_payments integer;
BEGIN
  SELECT count(*) INTO unresolved_payments
  FROM "payments"
  WHERE "subscription_id" IS NOT NULL AND "store_id" IS NULL;
  SELECT count(*) INTO unresolved_checkouts
  FROM "billing_checkout_sessions"
  WHERE "store_id" IS NULL;
  SELECT count(*) INTO unresolved_items
  FROM "subscription_items"
  WHERE "store_id" IS NULL;
  IF unresolved_payments > 0 OR unresolved_checkouts > 0 OR unresolved_items > 0 THEN
    RAISE EXCEPTION
      'Store-scoped billing preflight failed: % payment(s), % checkout(s), % item(s) lack unambiguous store evidence',
      unresolved_payments, unresolved_checkouts, unresolved_items;
  END IF;
END $$;

CREATE TEMP TABLE "billing_subscription_store_links" ON COMMIT DROP AS
SELECT DISTINCT "subscription_id", "tenant_id", "store_id"
FROM (
  SELECT "subscription_id", "tenant_id", "store_id"
  FROM "subscription_items"
  WHERE "store_id" IS NOT NULL
  UNION ALL
  SELECT "subscription_id", "tenant_id", "store_id"
  FROM "billing_plan_hires"
  UNION ALL
  SELECT "subscription_id", "tenant_id", "store_id"
  FROM "payments"
  WHERE "subscription_id" IS NOT NULL AND "store_id" IS NOT NULL
  UNION ALL
  SELECT "subscription_id", "tenant_id", "store_id"
  FROM "billing_checkout_sessions"
  WHERE "store_id" IS NOT NULL
  UNION ALL
  SELECT "subscription_id", "tenant_id", "store_id"
  FROM "billing_addon_contracts"
) scoped;

CREATE TEMP TABLE "billing_shared_subscription_ids" ON COMMIT DROP AS
SELECT "subscription_id"
FROM "billing_subscription_store_links"
GROUP BY "subscription_id"
HAVING count(*) > 1;

CREATE TEMP TABLE "billing_ambiguous_provider_subscription_ids" ON COMMIT DROP AS
SELECT hire."provider", hire."provider_subscription_id"
FROM "billing_plan_hires" hire
WHERE hire."provider_subscription_id" IS NOT NULL
GROUP BY hire."provider", hire."provider_subscription_id"
HAVING count(DISTINCT hire."store_id") > 1;

CREATE TEMP TABLE "billing_ambiguous_provider_subscription_scopes" ON COMMIT DROP AS
SELECT DISTINCT
  hire."subscription_id" AS "source_subscription_id",
  hire."tenant_id",
  hire."store_id"
FROM "billing_plan_hires" hire
JOIN "billing_ambiguous_provider_subscription_ids" ambiguous
  ON ambiguous."provider" = hire."provider"
 AND ambiguous."provider_subscription_id" = hire."provider_subscription_id";

UPDATE "billing_plan_hires" hire
SET "provider_subscription_id" = NULL, "updated_at" = now()
FROM "billing_ambiguous_provider_subscription_ids" ambiguous
WHERE hire."provider" = ambiguous."provider"
  AND hire."provider_subscription_id" = ambiguous."provider_subscription_id";

UPDATE "subscriptions" subscription
SET
  "provider_subscription_id" = NULL,
  "provider_lifecycle_event_id" = NULL,
  "provider_lifecycle_observed_at" = NULL,
  "updated_at" = now()
FROM "billing_ambiguous_provider_subscription_ids" ambiguous
WHERE subscription."provider" = ambiguous."provider"
  AND subscription."provider_subscription_id" = ambiguous."provider_subscription_id";

WITH ranked_store AS (
  SELECT
    links."subscription_id",
    links."store_id",
    row_number() OVER (
      PARTITION BY links."subscription_id"
      ORDER BY
        EXISTS (
          SELECT 1
          FROM "billing_plan_hires" hire
          JOIN "subscriptions" candidate
            ON candidate."id" = links."subscription_id"
          WHERE hire."subscription_id" = links."subscription_id"
            AND hire."tenant_id" = links."tenant_id"
            AND hire."store_id" = links."store_id"
            AND hire."provider_subscription_id" IS NOT NULL
            AND hire."provider_subscription_id" = candidate."provider_subscription_id"
        ) DESC,
        links."store_id"
    ) AS scope_rank
  FROM "billing_subscription_store_links" links
)
UPDATE "subscriptions" subscription
SET "store_id" = ranked."store_id", "updated_at" = now()
FROM ranked_store ranked
WHERE subscription."id" = ranked."subscription_id"
  AND ranked.scope_rank = 1;

UPDATE "subscriptions" subscription
SET
  "provider_subscription_id" = NULL,
  "provider_lifecycle_event_id" = NULL,
  "provider_lifecycle_observed_at" = NULL,
  "updated_at" = now()
WHERE subscription."provider_subscription_id" IS NOT NULL
  AND (
    SELECT count(*)
    FROM "billing_subscription_store_links" links
    WHERE links."subscription_id" = subscription."id"
  ) > 1
  AND (
    NOT EXISTS (
      SELECT 1
      FROM "billing_plan_hires" hire
      WHERE hire."subscription_id" = subscription."id"
        AND hire."tenant_id" = subscription."tenant_id"
        AND hire."store_id" = subscription."store_id"
        AND hire."provider" = subscription."provider"
        AND hire."provider_subscription_id" = subscription."provider_subscription_id"
    ) OR (
      SELECT count(DISTINCT hire."store_id")
      FROM "billing_plan_hires" hire
      WHERE hire."provider" = subscription."provider"
        AND hire."provider_subscription_id" = subscription."provider_subscription_id"
    ) <> 1
  );

WITH single_store_tenants AS (
  SELECT "tenant_id", min("id"::text)::uuid AS "store_id"
  FROM "stores"
  WHERE "is_deleted" = false AND "deleted_at" IS NULL
  GROUP BY "tenant_id"
  HAVING count(*) = 1
)
UPDATE "subscriptions" subscription
SET "store_id" = single_store."store_id", "updated_at" = now()
FROM single_store_tenants single_store
WHERE subscription."store_id" IS NULL
  AND subscription."tenant_id" = single_store."tenant_id";

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM "subscriptions" WHERE "store_id" IS NULL) THEN
    RAISE EXCEPTION
      'Cannot safely assign store scope to every billing subscription';
  END IF;
END $$;

CREATE TEMP TABLE "billing_subscription_store_targets" ON COMMIT DROP AS
SELECT
  links."subscription_id" AS "source_subscription_id",
  links."tenant_id",
  links."store_id",
  CASE
    WHEN subscription."store_id" = links."store_id" THEN subscription."id"
    ELSE gen_random_uuid()
  END AS "target_subscription_id"
FROM "billing_subscription_store_links" links
JOIN "subscriptions" subscription
  ON subscription."id" = links."subscription_id"
 AND subscription."tenant_id" = links."tenant_id";

CREATE TEMP TABLE "billing_shared_subscription_targets" ON COMMIT DROP AS
SELECT target.*
FROM "billing_subscription_store_targets" target
JOIN "billing_shared_subscription_ids" shared
  ON shared."subscription_id" = target."source_subscription_id";

INSERT INTO "subscriptions" (
  "id", "billing_customer_id", "current_period_end", "current_period_start",
  "provider", "provider_subscription_id", "provider_lifecycle_event_id",
  "provider_lifecycle_observed_at", "status", "store_id", "tenant_id",
  "created_at", "updated_at"
)
SELECT
  target."target_subscription_id",
  source."billing_customer_id",
  NULL,
  now(),
  source."provider",
  provider_hire."provider_subscription_id",
  NULL,
  NULL,
  'active',
  target."store_id",
  target."tenant_id",
  source."created_at",
  now()
FROM "billing_subscription_store_targets" target
JOIN "subscriptions" source
  ON source."id" = target."source_subscription_id"
LEFT JOIN LATERAL (
  SELECT hire."provider_subscription_id"
  FROM "billing_plan_hires" hire
  WHERE hire."subscription_id" = target."source_subscription_id"
    AND hire."tenant_id" = target."tenant_id"
    AND hire."store_id" = target."store_id"
    AND hire."provider_subscription_id" IS NOT NULL
    AND hire."provider_subscription_id" IS DISTINCT FROM source."provider_subscription_id"
    AND (
      SELECT count(DISTINCT other_hire."store_id")
      FROM "billing_plan_hires" other_hire
      WHERE other_hire."provider" = hire."provider"
        AND other_hire."provider_subscription_id" = hire."provider_subscription_id"
    ) = 1
  ORDER BY hire."updated_at" DESC, hire."created_at" DESC
  LIMIT 1
) provider_hire ON true
WHERE target."target_subscription_id" <> target."source_subscription_id";

UPDATE "subscription_items" child
SET "subscription_id" = target."target_subscription_id", "updated_at" = now()
FROM "billing_subscription_store_targets" target
WHERE child."subscription_id" = target."source_subscription_id"
  AND child."tenant_id" = target."tenant_id"
  AND child."store_id" = target."store_id"
  AND target."target_subscription_id" <> target."source_subscription_id";

UPDATE "billing_plan_hires" child
SET "subscription_id" = target."target_subscription_id", "updated_at" = now()
FROM "billing_subscription_store_targets" target
WHERE child."subscription_id" = target."source_subscription_id"
  AND child."tenant_id" = target."tenant_id"
  AND child."store_id" = target."store_id"
  AND target."target_subscription_id" <> target."source_subscription_id";

UPDATE "payments" child
SET "subscription_id" = target."target_subscription_id", "updated_at" = now()
FROM "billing_subscription_store_targets" target
WHERE child."subscription_id" = target."source_subscription_id"
  AND child."tenant_id" = target."tenant_id"
  AND child."store_id" = target."store_id"
  AND target."target_subscription_id" <> target."source_subscription_id";

UPDATE "billing_checkout_sessions" child
SET "subscription_id" = target."target_subscription_id", "updated_at" = now()
FROM "billing_subscription_store_targets" target
WHERE child."subscription_id" = target."source_subscription_id"
  AND child."tenant_id" = target."tenant_id"
  AND child."store_id" = target."store_id"
  AND target."target_subscription_id" <> target."source_subscription_id";

UPDATE "billing_addon_contracts" child
SET "subscription_id" = target."target_subscription_id", "updated_at" = now()
FROM "billing_subscription_store_targets" target
WHERE child."subscription_id" = target."source_subscription_id"
  AND child."tenant_id" = target."tenant_id"
  AND child."store_id" = target."store_id"
  AND target."target_subscription_id" <> target."source_subscription_id";

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM "billing_shared_subscription_targets") AND NOT EXISTS (
    SELECT 1 FROM "plans"
    WHERE "catalog_version" = '2026-08-v3'
      AND "code" = 'free'
      AND "status" = 'active'
  ) THEN
    RAISE EXCEPTION
      'Store-scoped billing split requires the active 2026-08-v3 Free plan';
  END IF;
END $$;

UPDATE "subscription_items" item
SET
  "starts_at" = LEAST(
    COALESCE(item."starts_at", now() - interval '1 microsecond'),
    now() - interval '1 microsecond'
  ),
  "ends_at" = now(),
  "updated_at" = now()
FROM "billing_shared_subscription_targets" target
WHERE item."subscription_id" = target."target_subscription_id"
  AND item."tenant_id" = target."tenant_id"
  AND item."store_id" = target."store_id"
  AND item."item_type" = 'plan'
  AND (item."ends_at" IS NULL OR item."ends_at" > now());

INSERT INTO "subscription_items" (
  "item_type", "plan_id", "quantity", "starts_at", "store_id",
  "subscription_id", "tenant_id", "unit_amount_cents"
)
SELECT
  'plan', free_plan."id", 1, now(), target."store_id",
  target."target_subscription_id", target."tenant_id", 0
FROM "billing_shared_subscription_targets" target
CROSS JOIN LATERAL (
  SELECT "id"
  FROM "plans"
  WHERE "catalog_version" = '2026-08-v3'
    AND "code" = 'free'
    AND "status" = 'active'
  ORDER BY "published_at" DESC
  LIMIT 1
) free_plan;

UPDATE "subscriptions" subscription
SET
  "current_period_end" = NULL,
  "current_period_start" = now(),
  "provider_lifecycle_event_id" = NULL,
  "provider_lifecycle_observed_at" = NULL,
  "status" = 'active',
  "updated_at" = now()
FROM "billing_shared_subscription_targets" target
WHERE subscription."id" = target."target_subscription_id"
  AND subscription."tenant_id" = target."tenant_id"
  AND subscription."store_id" = target."store_id";

INSERT INTO "store_entitlement_events" (
  "feature_key", "metadata", "next_status", "previous_status", "reason",
  "source", "store_id", "tenant_id"
)
SELECT
  entitlement."feature_key",
  '{"sourceDetail":"store_scope_migration"}'::jsonb,
  'inactive', entitlement."status",
  'Shared legacy subscription moved to the permanent Free contract.',
  'store_scope_migration', target."store_id", target."tenant_id"
FROM "billing_shared_subscription_targets" target
JOIN "store_entitlements" entitlement
  ON entitlement."tenant_id" = target."tenant_id"
 AND entitlement."store_id" = target."store_id"
WHERE entitlement."source" = 'billing_catalog'
  AND entitlement."status" <> 'inactive'
  AND NOT EXISTS (
    SELECT 1
    FROM "plans" free_plan
    JOIN "plan_features" feature
      ON feature."plan_id" = free_plan."id"
     AND feature."included" = 1
    WHERE free_plan."catalog_version" = '2026-08-v3'
      AND free_plan."code" = 'free'
      AND free_plan."status" = 'active'
      AND feature."feature_key" = entitlement."feature_key"
  );

UPDATE "store_entitlements" entitlement
SET "status" = 'inactive', "ends_at" = now(), "updated_at" = now()
FROM "billing_shared_subscription_targets" target
WHERE entitlement."tenant_id" = target."tenant_id"
  AND entitlement."store_id" = target."store_id"
  AND entitlement."source" = 'billing_catalog'
  AND entitlement."status" <> 'inactive'
  AND NOT EXISTS (
    SELECT 1
    FROM "plans" free_plan
    JOIN "plan_features" feature
      ON feature."plan_id" = free_plan."id"
     AND feature."included" = 1
    WHERE free_plan."catalog_version" = '2026-08-v3'
      AND free_plan."code" = 'free'
      AND free_plan."status" = 'active'
      AND feature."feature_key" = entitlement."feature_key"
  );

INSERT INTO "store_entitlement_events" (
  "feature_key", "metadata", "next_status", "previous_status", "reason",
  "source", "store_id", "tenant_id"
)
SELECT
  feature."feature_key",
  '{"sourceDetail":"store_scope_migration"}'::jsonb,
  'active', entitlement."status",
  'Permanent Free contract projected after store-scoped billing migration.',
  'store_scope_migration', target."store_id", target."tenant_id"
FROM "billing_shared_subscription_targets" target
JOIN "plans" free_plan
  ON free_plan."catalog_version" = '2026-08-v3'
 AND free_plan."code" = 'free'
 AND free_plan."status" = 'active'
JOIN "plan_features" feature
  ON feature."plan_id" = free_plan."id"
 AND feature."included" = 1
LEFT JOIN "store_entitlements" entitlement
  ON entitlement."store_id" = target."store_id"
 AND entitlement."feature_key" = feature."feature_key"
WHERE entitlement."id" IS NULL OR (
  NOT (
    entitlement."source" <> 'billing_catalog' AND
    (entitlement."ends_at" IS NULL OR entitlement."ends_at" > now())
  ) AND (entitlement."status" <> 'active' OR entitlement."ends_at" IS NOT NULL)
);

INSERT INTO "store_entitlements" (
  "ends_at", "feature_key", "metadata", "source", "starts_at", "status",
  "store_id", "tenant_id"
)
SELECT
  NULL, feature."feature_key", '{"sourceDetail":"store_scope_migration"}'::jsonb,
  'billing_catalog', now(), 'active', target."store_id", target."tenant_id"
FROM "billing_shared_subscription_targets" target
JOIN "plans" free_plan
  ON free_plan."catalog_version" = '2026-08-v3'
 AND free_plan."code" = 'free'
 AND free_plan."status" = 'active'
JOIN "plan_features" feature
  ON feature."plan_id" = free_plan."id"
 AND feature."included" = 1
WHERE NOT EXISTS (
  SELECT 1
  FROM "store_entitlements" entitlement
  WHERE entitlement."store_id" = target."store_id"
    AND entitlement."feature_key" = feature."feature_key"
    AND entitlement."source" <> 'billing_catalog'
    AND (entitlement."ends_at" IS NULL OR entitlement."ends_at" > now())
)
ON CONFLICT ("store_id", "feature_key") DO UPDATE SET
  "ends_at" = NULL,
  "metadata" = EXCLUDED."metadata",
  "source" = EXCLUDED."source",
  "starts_at" = now(),
  "status" = 'active',
  "tenant_id" = EXCLUDED."tenant_id",
  "updated_at" = now();

INSERT INTO "billing_provider_reconciliations" (
  "available_at", "kind", "status", "store_id", "subscription_id", "tenant_id"
)
SELECT
  now(), 'catalog_migration', 'queued', target."store_id",
  target."target_subscription_id", target."tenant_id"
FROM (
  SELECT
    "target_subscription_id", "tenant_id", "store_id"
  FROM "billing_shared_subscription_targets"
  UNION
  SELECT
    target."target_subscription_id", target."tenant_id", target."store_id"
  FROM "billing_ambiguous_provider_subscription_scopes" ambiguous
  JOIN "billing_subscription_store_targets" target
    ON target."source_subscription_id" = ambiguous."source_subscription_id"
   AND target."tenant_id" = ambiguous."tenant_id"
   AND target."store_id" = ambiguous."store_id"
) target
ON CONFLICT ("kind", "subscription_id")
  WHERE "target_provider_subscription_id" IS NULL
DO NOTHING;

UPDATE "billing_provider_reconciliations" reconciliation
SET "store_id" = subscription."store_id", "updated_at" = now()
FROM "subscriptions" subscription
WHERE reconciliation."subscription_id" = subscription."id"
  AND reconciliation."tenant_id" = subscription."tenant_id"
  AND reconciliation."store_id" IS DISTINCT FROM subscription."store_id";

ALTER TABLE "subscriptions" ALTER COLUMN "store_id" SET NOT NULL;
ALTER TABLE "subscription_items" ALTER COLUMN "store_id" SET NOT NULL;
ALTER TABLE "billing_checkout_sessions" ALTER COLUMN "store_id" SET NOT NULL;
ALTER TABLE "billing_provider_reconciliations"
  ALTER COLUMN "store_id" SET NOT NULL;

CREATE INDEX IF NOT EXISTS "subscriptions_tenant_store_created_idx"
  ON "subscriptions" ("tenant_id", "store_id", "created_at");
CREATE UNIQUE INDEX IF NOT EXISTS "subscriptions_id_tenant_store_unique"
  ON "subscriptions" ("id", "tenant_id", "store_id");
CREATE UNIQUE INDEX IF NOT EXISTS "subscriptions_tenant_store_provider_unique"
  ON "subscriptions" ("tenant_id", "store_id", "provider");
DROP INDEX IF EXISTS "payments_scoped_identity_unique";
CREATE UNIQUE INDEX "payments_scoped_identity_unique"
  ON "payments" ("id", "subscription_id", "tenant_id", "store_id");

DO $$ BEGIN
  ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_store_tenant_fk"
    FOREIGN KEY ("store_id", "tenant_id")
    REFERENCES "stores" ("id", "tenant_id");
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE "subscription_items"
  DROP CONSTRAINT IF EXISTS "subscription_items_subscription_tenant_fk";
DO $$ BEGIN
  ALTER TABLE "subscription_items"
    ADD CONSTRAINT "subscription_items_subscription_scope_fk"
    FOREIGN KEY ("subscription_id", "tenant_id", "store_id")
    REFERENCES "subscriptions" ("id", "tenant_id", "store_id");
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE "billing_plan_hires"
  DROP CONSTRAINT IF EXISTS "billing_plan_hires_subscription_tenant_fk";
DO $$ BEGIN
  ALTER TABLE "billing_plan_hires"
    ADD CONSTRAINT "billing_plan_hires_subscription_scope_fk"
    FOREIGN KEY ("subscription_id", "tenant_id", "store_id")
    REFERENCES "subscriptions" ("id", "tenant_id", "store_id");
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "payments" ADD CONSTRAINT "payments_store_tenant_fk"
    FOREIGN KEY ("store_id", "tenant_id")
    REFERENCES "stores" ("id", "tenant_id");
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "payments" ADD CONSTRAINT "payments_subscription_scope_fk"
    FOREIGN KEY ("subscription_id", "tenant_id", "store_id")
    REFERENCES "subscriptions" ("id", "tenant_id", "store_id");
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "payments" ADD CONSTRAINT "payments_subscription_store_check"
    CHECK ("subscription_id" IS NULL OR "store_id" IS NOT NULL);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "billing_checkout_sessions"
    ADD CONSTRAINT "billing_checkout_sessions_subscription_scope_fk"
    FOREIGN KEY ("subscription_id", "tenant_id", "store_id")
    REFERENCES "subscriptions" ("id", "tenant_id", "store_id");
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE "billing_provider_reconciliations"
  DROP CONSTRAINT IF EXISTS "billing_provider_reconciliations_subscription_tenant_fk";
DO $$ BEGIN
  ALTER TABLE "billing_provider_reconciliations"
    ADD CONSTRAINT "billing_provider_reconciliations_store_tenant_fk"
    FOREIGN KEY ("store_id", "tenant_id")
    REFERENCES "stores" ("id", "tenant_id");
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "billing_provider_reconciliations"
    ADD CONSTRAINT "billing_provider_reconciliations_subscription_scope_fk"
    FOREIGN KEY ("subscription_id", "tenant_id", "store_id")
    REFERENCES "subscriptions" ("id", "tenant_id", "store_id");
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE "billing_addon_contracts"
  DROP CONSTRAINT IF EXISTS "billing_addon_contracts_subscription_tenant_fk";
DO $$ BEGIN
  ALTER TABLE "billing_addon_contracts"
    ADD CONSTRAINT "billing_addon_contracts_subscription_scope_fk"
    FOREIGN KEY ("subscription_id", "tenant_id", "store_id")
    REFERENCES "subscriptions" ("id", "tenant_id", "store_id");
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DROP INDEX IF EXISTS "subscriptions_id_tenant_unique";

DO $$ BEGIN
  ALTER TABLE "billing_plan_hires"
    ADD CONSTRAINT "billing_plan_hires_effective_item_scope_fk"
    FOREIGN KEY (
      "effective_subscription_item_id", "subscription_id", "tenant_id", "store_id"
    ) REFERENCES "subscription_items" (
      "id", "subscription_id", "tenant_id", "store_id"
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "billing_addon_contracts"
    ADD CONSTRAINT "billing_addon_contracts_item_scope_fk"
    FOREIGN KEY ("subscription_item_id", "subscription_id", "tenant_id", "store_id")
    REFERENCES "subscription_items" (
      "id", "subscription_id", "tenant_id", "store_id"
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "billing_addon_contracts"
    ADD CONSTRAINT "billing_addon_contracts_payment_scope_fk"
    FOREIGN KEY (
      "activated_by_payment_id", "subscription_id", "tenant_id", "store_id"
    ) REFERENCES "payments" (
      "id", "subscription_id", "tenant_id", "store_id"
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
