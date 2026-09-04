CREATE TYPE "public"."billing_catalog_version_status" AS ENUM('staged', 'active', 'superseded');--> statement-breakpoint
CREATE TABLE "billing_catalog_versions" (
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"activated_at" timestamp with time zone,
	"activation_audit_claimed_at" timestamp with time zone,
	"activation_audit_claim_token" varchar(191),
	"activation_audit_recorded_at" timestamp with time zone,
	"checksum" varchar(64) NOT NULL,
	"definition" jsonb NOT NULL,
	"previous_version" varchar(80),
	"published_at" timestamp with time zone NOT NULL,
	"status" "billing_catalog_version_status" DEFAULT 'staged' NOT NULL,
	"version" varchar(80) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX "billing_catalog_versions_version_unique" ON "billing_catalog_versions" USING btree ("version");--> statement-breakpoint
CREATE UNIQUE INDEX "billing_catalog_versions_single_active_unique" ON "billing_catalog_versions" USING btree ("status") WHERE "billing_catalog_versions"."status" = 'active';--> statement-breakpoint
WITH "legacy_catalog" AS (
	SELECT
		jsonb_build_object(
			'kind', 'legacy_relational_snapshot',
			'version', '2026-08-v1',
			'plans', COALESCE((
				SELECT jsonb_agg(to_jsonb("legacy_plan") ORDER BY "legacy_plan"."code")
				FROM "plans" AS "legacy_plan"
				WHERE "legacy_plan"."catalog_version" = '2026-08-v1'
			), '[]'::jsonb),
			'planFeatures', COALESCE((
				SELECT jsonb_agg(to_jsonb("legacy_feature") ORDER BY "legacy_feature"."plan_id", "legacy_feature"."feature_key")
				FROM "plan_features" AS "legacy_feature"
				INNER JOIN "plans" AS "legacy_feature_plan"
					ON "legacy_feature_plan"."id" = "legacy_feature"."plan_id"
				WHERE "legacy_feature_plan"."catalog_version" = '2026-08-v1'
			), '[]'::jsonb),
			'addons', COALESCE((
				SELECT jsonb_agg(to_jsonb("legacy_addon") ORDER BY "legacy_addon"."code")
				FROM "addons" AS "legacy_addon"
				WHERE "legacy_addon"."catalog_version" = '2026-08-v1'
			), '[]'::jsonb)
		) AS "definition",
		COALESCE(
			(SELECT max("published_at") FROM "plans" WHERE "catalog_version" = '2026-08-v1'),
			now()
		) AS "published_at"
	WHERE EXISTS (
		SELECT 1 FROM "plans" WHERE "catalog_version" = '2026-08-v1'
	)
), "legacy_catalog_fingerprint" AS (
	SELECT
		"definition",
		md5("definition"::text) || md5('legacy:' || "definition"::text) AS "checksum",
		"published_at"
	FROM "legacy_catalog"
)
INSERT INTO "billing_catalog_versions" (
	"activated_at", "checksum", "definition", "published_at", "status", "version"
)
SELECT
	"published_at", "checksum", "definition", "published_at", 'active', '2026-08-v1'
FROM "legacy_catalog_fingerprint";
