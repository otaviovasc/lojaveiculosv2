DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM "sales"
    WHERE "unit_id" IS NOT NULL
      AND "is_current_revision" = true
      AND "is_deleted" = false
      AND "deleted_at" IS NULL
      AND "status" <> 'cancelled'
    GROUP BY "unit_id"
    HAVING count(*) > 1
  ) THEN
    RAISE EXCEPTION
      'Cannot install sales_current_unit_unique: duplicate current sales exist for a vehicle unit.';
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS "sales_current_unit_unique"
  ON "sales" ("unit_id")
  WHERE "unit_id" IS NOT NULL
    AND "is_current_revision" = true
    AND "is_deleted" = false
    AND "deleted_at" IS NULL
    AND "status" <> 'cancelled';
