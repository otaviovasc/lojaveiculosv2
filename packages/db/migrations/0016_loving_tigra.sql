ALTER TABLE "store_custom_pages" ADD COLUMN "source_listing_id" uuid;--> statement-breakpoint
ALTER TABLE "store_custom_pages" ADD CONSTRAINT "store_custom_pages_source_listing_id_vehicle_listings_id_fk" FOREIGN KEY ("source_listing_id") REFERENCES "public"."vehicle_listings"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "store_custom_pages_source_listing_unique" ON "store_custom_pages" USING btree ("tenant_id","store_id","source_listing_id") WHERE "store_custom_pages"."is_deleted" = false AND "store_custom_pages"."source_listing_id" IS NOT NULL;
