CREATE TYPE "public"."fiscal_connection_status" AS ENUM('not_configured', 'pending_review', 'ready', 'error');--> statement-breakpoint
CREATE TYPE "public"."fiscal_defaults_status" AS ENUM('missing', 'unconfirmed', 'confirmed');--> statement-breakpoint
CREATE TABLE "fiscal_provider_connections" (
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"capabilities" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"certificate_expires_at" timestamp with time zone,
	"company_id" varchar(191),
	"credential_ciphertext" text,
	"defaults_confirmed_at" timestamp with time zone,
	"defaults_confirmed_by" varchar(191),
	"defaults_status" "fiscal_defaults_status" DEFAULT 'missing' NOT NULL,
	"issuer_profile" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"last_error_code" varchar(120),
	"last_synced_at" timestamp with time zone,
	"provider" varchar(80) DEFAULT 'spedy' NOT NULL,
	"status" "fiscal_connection_status" DEFAULT 'not_configured' NOT NULL,
	"store_id" uuid NOT NULL,
	"tax_defaults" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"tenant_id" uuid NOT NULL,
	"webhook_registered_at" timestamp with time zone
);
--> statement-breakpoint
DROP INDEX "fiscal_documents_provider_document_unique";--> statement-breakpoint
ALTER TABLE "fiscal_provider_connections" ADD CONSTRAINT "fiscal_provider_connections_store_id_stores_id_fk" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fiscal_provider_connections" ADD CONSTRAINT "fiscal_provider_connections_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "fiscal_provider_connections_store_provider_unique" ON "fiscal_provider_connections" USING btree ("store_id","provider");--> statement-breakpoint
CREATE UNIQUE INDEX "fiscal_provider_connections_company_provider_unique" ON "fiscal_provider_connections" USING btree ("company_id","provider");--> statement-breakpoint
CREATE INDEX "fiscal_provider_connections_tenant_store_idx" ON "fiscal_provider_connections" USING btree ("tenant_id","store_id");--> statement-breakpoint
CREATE UNIQUE INDEX "fiscal_documents_provider_document_unique" ON "fiscal_documents" USING btree ("store_id","provider","provider_document_id");--> statement-breakpoint

-- NF-e and NFS-e are one commercial fiscal add-on. Merge legacy `nfe`
-- projections before switching the canonical key so existing stores retain
-- their purchased/trial state.
INSERT INTO "plan_features" (
	"feature_key", "included", "included_in_trial", "limit_value", "plan_id"
)
SELECT
	'fiscal', "included", "included_in_trial", "limit_value", "plan_id"
FROM "plan_features"
WHERE "feature_key" = 'nfe'
ON CONFLICT ("plan_id", "feature_key") DO UPDATE SET
	"included" = GREATEST("plan_features"."included", EXCLUDED."included"),
	"included_in_trial" = "plan_features"."included_in_trial" OR EXCLUDED."included_in_trial",
	"limit_value" = COALESCE("plan_features"."limit_value", EXCLUDED."limit_value"),
	"updated_at" = now();--> statement-breakpoint
DELETE FROM "plan_features" WHERE "feature_key" = 'nfe';--> statement-breakpoint

UPDATE "subscription_items" AS item
SET "addon_id" = canonical."id", "updated_at" = now()
FROM "addons" AS legacy
JOIN "addons" AS canonical
	ON canonical."catalog_version" = legacy."catalog_version"
	AND canonical."code" = 'fiscal_spedy'
WHERE item."addon_id" = legacy."id"
	AND legacy."code" = 'nfe_spedy';--> statement-breakpoint
DELETE FROM "addons" AS legacy
USING "addons" AS canonical
WHERE legacy."code" = 'nfe_spedy'
	AND canonical."code" = 'fiscal_spedy'
	AND canonical."catalog_version" = legacy."catalog_version";--> statement-breakpoint
UPDATE "addons"
SET
	"code" = 'fiscal_spedy',
	"feature_key" = 'fiscal',
	"name" = 'Fiscal NF-e + NFS-e',
	"updated_at" = now()
WHERE "code" = 'nfe_spedy';--> statement-breakpoint
UPDATE "addons"
SET
	"feature_key" = 'fiscal',
	"name" = 'Fiscal NF-e + NFS-e',
	"updated_at" = now()
WHERE "code" = 'fiscal_spedy' OR "feature_key" = 'nfe';--> statement-breakpoint

UPDATE "store_entitlements" AS canonical
SET
	"metadata" = legacy."metadata" || canonical."metadata",
	"source" = CASE
		WHEN canonical."status" IN ('active', 'trialing') THEN canonical."source"
		ELSE legacy."source"
	END,
	"status" = CASE
		WHEN canonical."status" = 'active' OR legacy."status" = 'active' THEN 'active'::"entitlement_status"
		WHEN canonical."status" = 'trialing' OR legacy."status" = 'trialing' THEN 'trialing'::"entitlement_status"
		WHEN canonical."status" = 'suspended' OR legacy."status" = 'suspended' THEN 'suspended'::"entitlement_status"
		ELSE 'inactive'::"entitlement_status"
	END,
	"starts_at" = LEAST(canonical."starts_at", legacy."starts_at"),
	"ends_at" = GREATEST(canonical."ends_at", legacy."ends_at"),
	"updated_at" = now()
FROM "store_entitlements" AS legacy
WHERE canonical."store_id" = legacy."store_id"
	AND canonical."feature_key" = 'fiscal'
	AND legacy."feature_key" = 'nfe';--> statement-breakpoint
DELETE FROM "store_entitlements" AS legacy
USING "store_entitlements" AS canonical
WHERE legacy."store_id" = canonical."store_id"
	AND legacy."feature_key" = 'nfe'
	AND canonical."feature_key" = 'fiscal';--> statement-breakpoint
UPDATE "store_entitlements"
SET "feature_key" = 'fiscal', "updated_at" = now()
WHERE "feature_key" = 'nfe';--> statement-breakpoint
UPDATE "store_entitlement_events"
SET "feature_key" = 'fiscal', "updated_at" = now()
WHERE "feature_key" = 'nfe';--> statement-breakpoint

INSERT INTO "role_template_permissions" ("role_template_id", "permission_key")
SELECT role."id", permission."permission_key"
FROM "role_templates" AS role
CROSS JOIN (
	VALUES
		('fiscal.certificate.manage'),
		('fiscal.defaults.confirm'),
		('fiscal.provider.configure')
) AS permission("permission_key")
WHERE role."role_key" IN ('agency', 'admin', 'owner')
ON CONFLICT ("role_template_id", "permission_key") DO NOTHING;
