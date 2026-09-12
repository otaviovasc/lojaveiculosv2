DROP INDEX IF EXISTS "vehicle_units_store_plate_unique";
DROP INDEX IF EXISTS "vehicle_units_store_stock_unique";
DROP INDEX IF EXISTS "vehicle_units_store_vin_unique";

CREATE UNIQUE INDEX "vehicle_units_store_plate_unique"
  ON "vehicle_units" USING btree ("store_id", "plate")
  WHERE "is_deleted" = false AND "deleted_at" IS NULL;
CREATE UNIQUE INDEX "vehicle_units_store_stock_unique"
  ON "vehicle_units" USING btree ("store_id", "stock_number")
  WHERE "is_deleted" = false AND "deleted_at" IS NULL;
CREATE UNIQUE INDEX "vehicle_units_store_vin_unique"
  ON "vehicle_units" USING btree ("store_id", "vin")
  WHERE "is_deleted" = false AND "deleted_at" IS NULL;
