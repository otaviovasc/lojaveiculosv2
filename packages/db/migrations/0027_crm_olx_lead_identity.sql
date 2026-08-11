ALTER TABLE "leads" ADD COLUMN "source_identity_key" varchar(64);--> statement-breakpoint
CREATE UNIQUE INDEX "leads_source_identity_unique" ON "leads" USING btree ("tenant_id","store_id","source","source_identity_key") WHERE "source_identity_key" IS NOT NULL AND "is_deleted" = false;
