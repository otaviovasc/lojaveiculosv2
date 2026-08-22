CREATE TYPE "public"."vehicle_cost_status" AS ENUM('active', 'voided');
--> statement-breakpoint
ALTER TABLE "vehicle_costs" ADD COLUMN "status" "vehicle_cost_status" DEFAULT 'active' NOT NULL;
--> statement-breakpoint
ALTER TABLE "vehicle_costs" ADD COLUMN "voided_at" timestamp with time zone;
--> statement-breakpoint
ALTER TABLE "vehicle_costs" ADD COLUMN "void_reason" text;
--> statement-breakpoint
CREATE INDEX "vehicle_costs_status_idx" ON "vehicle_costs" USING btree ("status");
--> statement-breakpoint
INSERT INTO "role_template_permissions" ("role_template_id", "permission_key")
SELECT "role_template_id", 'inventory.cost_update'
FROM "role_template_permissions"
WHERE "permission_key" = 'inventory.cost_create'
ON CONFLICT ("role_template_id", "permission_key") DO NOTHING;
--> statement-breakpoint
INSERT INTO "role_template_permissions" ("role_template_id", "permission_key")
SELECT "role_template_id", 'inventory.cost_void'
FROM "role_template_permissions"
WHERE "permission_key" = 'inventory.cost_create'
ON CONFLICT ("role_template_id", "permission_key") DO NOTHING;
