ALTER TABLE "vehicle_units" ADD COLUMN "renavam" varchar(32);--> statement-breakpoint
CREATE UNIQUE INDEX "vehicle_units_store_renavam_unique" ON "vehicle_units" USING btree ("store_id","renavam") WHERE "vehicle_units"."is_deleted" = false AND "vehicle_units"."deleted_at" IS NULL;
