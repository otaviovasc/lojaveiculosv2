ALTER TABLE "lead_visits" ADD COLUMN "listing_id" uuid;--> statement-breakpoint
ALTER TABLE "lead_visits" ADD COLUMN "vehicle_title" varchar(191);--> statement-breakpoint
ALTER TABLE "lead_visits" ADD CONSTRAINT "lead_visits_listing_id_vehicle_listings_id_fk" FOREIGN KEY ("listing_id") REFERENCES "public"."vehicle_listings"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "lead_visits_listing_id_idx" ON "lead_visits" USING btree ("listing_id");