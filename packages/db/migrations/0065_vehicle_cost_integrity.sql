DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM "vehicle_costs"
    WHERE
      ("status" = 'active' AND ("voided_at" IS NOT NULL OR "void_reason" IS NOT NULL))
      OR (
        "status" = 'voided'
        AND ("voided_at" IS NULL OR "void_reason" IS NULL OR length(btrim("void_reason")) < 3)
      )
  ) THEN
    RAISE EXCEPTION 'Vehicle cost lifecycle integrity blocked: repair invalid void fields before migrating';
  END IF;
END $$;
--> statement-breakpoint
ALTER TABLE "vehicle_costs"
  ADD CONSTRAINT "vehicle_costs_status_void_fields_check"
  CHECK (
    ("status" = 'active' AND "voided_at" IS NULL AND "void_reason" IS NULL)
    OR (
      "status" = 'voided'
      AND "voided_at" IS NOT NULL
      AND "void_reason" IS NOT NULL
      AND length(btrim("void_reason")) >= 3
    )
  );
--> statement-breakpoint
CREATE UNIQUE INDEX "vehicle_units_id_tenant_store_unique"
ON "vehicle_units" ("id", "tenant_id", "store_id");
--> statement-breakpoint
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM "vehicle_costs" AS "cost"
    INNER JOIN "vehicle_units" AS "unit" ON "unit"."id" = "cost"."unit_id"
    WHERE "unit"."tenant_id" <> "cost"."tenant_id"
      OR "unit"."store_id" <> "cost"."store_id"
  ) THEN
    RAISE EXCEPTION 'Vehicle cost scope integrity blocked: cost scope differs from its vehicle unit';
  END IF;
END $$;
--> statement-breakpoint
ALTER TABLE "vehicle_costs"
  DROP CONSTRAINT IF EXISTS "vehicle_costs_unit_id_vehicle_units_id_fk";
--> statement-breakpoint
ALTER TABLE "vehicle_costs"
  ADD CONSTRAINT "vehicle_costs_unit_scope_fk"
  FOREIGN KEY ("unit_id", "tenant_id", "store_id")
  REFERENCES "vehicle_units" ("id", "tenant_id", "store_id")
  ON DELETE NO ACTION
  ON UPDATE NO ACTION;
--> statement-breakpoint
CREATE TEMP TABLE "duplicate_vehicle_cost_finance_links" AS
SELECT "link_id", "entry_id", "target_id", "canonical_entry_id"
FROM (
  SELECT
    "link"."id" AS "link_id",
    "link"."entry_id",
    "link"."target_id",
    FIRST_VALUE("link"."entry_id") OVER (
      PARTITION BY "link"."tenant_id", "link"."store_id", "link"."target_id"
      ORDER BY "link"."created_at" ASC, "link"."id" ASC
    ) AS "canonical_entry_id",
    ROW_NUMBER() OVER (
      PARTITION BY "link"."tenant_id", "link"."store_id", "link"."target_id"
      ORDER BY "link"."created_at" ASC, "link"."id" ASC
    ) AS "link_rank"
  FROM "finance_entry_links" AS "link"
  WHERE "link"."target_type" = 'vehicle_cost'
) AS "ranked_links"
WHERE "link_rank" > 1;
--> statement-breakpoint
DELETE FROM "finance_entry_links"
WHERE "id" IN (
  SELECT "link_id" FROM "duplicate_vehicle_cost_finance_links"
);
--> statement-breakpoint
UPDATE "finance_entries" AS "entry"
SET
  "status" = 'cancelled',
  "metadata" = "entry"."metadata" || jsonb_build_object(
    'vehicleCostDuplicateReconciliation',
    jsonb_build_object(
      'reason', 'duplicate_vehicle_cost_finance_link',
      'canonicalTargets', "repair"."canonical_targets",
      'linksRetained', true
    )
  ),
  "updated_at" = NOW()
FROM (
  SELECT
    "entry_id",
    jsonb_agg(
      jsonb_build_object(
        'vehicleCostId', "target_id",
        'canonicalEntryId', "canonical_entry_id"
      )
      ORDER BY "target_id"
    ) AS "canonical_targets"
  FROM "duplicate_vehicle_cost_finance_links"
  WHERE "entry_id" <> "canonical_entry_id"
  GROUP BY "entry_id"
) AS "repair"
WHERE "entry"."id" = "repair"."entry_id"
  AND NOT EXISTS (
    SELECT 1
    FROM "finance_entry_links" AS "retained_link"
    WHERE "retained_link"."entry_id" = "entry"."id"
      AND "retained_link"."target_type" = 'vehicle_cost'
  );
--> statement-breakpoint
DROP TABLE "duplicate_vehicle_cost_finance_links";
--> statement-breakpoint
CREATE UNIQUE INDEX "finance_entry_links_vehicle_cost_target_unique"
ON "finance_entry_links" ("tenant_id", "store_id", "target_id")
WHERE "target_type" = 'vehicle_cost';
