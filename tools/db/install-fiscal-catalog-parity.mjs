export async function installFiscalCatalogParity(sql) {
  await sql.begin(async (transaction) => {
    await transaction.unsafe(`
      INSERT INTO "plan_features" (
        "feature_key", "included", "included_in_trial", "limit_value", "plan_id"
      )
      SELECT
        'fiscal', "included", "included_in_trial", "limit_value", "plan_id"
      FROM "plan_features"
      WHERE "feature_key" = 'nfe'
      ON CONFLICT ("plan_id", "feature_key") DO UPDATE SET
        "included" = GREATEST("plan_features"."included", EXCLUDED."included"),
        "included_in_trial" =
          "plan_features"."included_in_trial" OR EXCLUDED."included_in_trial",
        "limit_value" =
          COALESCE("plan_features"."limit_value", EXCLUDED."limit_value"),
        "updated_at" = now();

      UPDATE "subscription_items" AS item
      SET "addon_id" = canonical."id", "updated_at" = now()
      FROM "addons" AS legacy
      JOIN "addons" AS canonical
        ON canonical."catalog_version" = legacy."catalog_version"
        AND canonical."code" = 'fiscal_spedy'
      WHERE item."addon_id" = legacy."id"
        AND legacy."code" = 'nfe_spedy';

      DELETE FROM "addons" AS legacy
      USING "addons" AS canonical
      WHERE legacy."code" = 'nfe_spedy'
        AND canonical."code" = 'fiscal_spedy'
        AND canonical."catalog_version" = legacy."catalog_version";

      UPDATE "addons"
      SET
        "code" = 'fiscal_spedy',
        "feature_key" = 'fiscal',
        "name" = 'Fiscal NF-e + NFS-e',
        "updated_at" = now()
      WHERE "code" = 'nfe_spedy';

      UPDATE "addons"
      SET
        "feature_key" = 'fiscal',
        "name" = 'Fiscal NF-e + NFS-e',
        "updated_at" = now()
      WHERE "code" = 'fiscal_spedy' OR "feature_key" = 'nfe';

      UPDATE "store_entitlements" AS canonical
      SET
        "metadata" = legacy."metadata" || canonical."metadata",
        "source" = CASE
          WHEN canonical."status" IN ('active', 'trialing')
            THEN canonical."source"
          ELSE legacy."source"
        END,
        "status" = CASE
          WHEN canonical."status" = 'active' OR legacy."status" = 'active'
            THEN 'active'::"entitlement_status"
          WHEN canonical."status" = 'trialing' OR legacy."status" = 'trialing'
            THEN 'trialing'::"entitlement_status"
          WHEN canonical."status" = 'suspended' OR legacy."status" = 'suspended'
            THEN 'suspended'::"entitlement_status"
          ELSE 'inactive'::"entitlement_status"
        END,
        "starts_at" = LEAST(canonical."starts_at", legacy."starts_at"),
        "ends_at" = GREATEST(canonical."ends_at", legacy."ends_at"),
        "updated_at" = now()
      FROM "store_entitlements" AS legacy
      WHERE canonical."store_id" = legacy."store_id"
        AND canonical."feature_key" = 'fiscal'
        AND legacy."feature_key" = 'nfe';

      DELETE FROM "store_entitlements" AS legacy
      USING "store_entitlements" AS canonical
      WHERE legacy."store_id" = canonical."store_id"
        AND legacy."feature_key" = 'nfe'
        AND canonical."feature_key" = 'fiscal';

      DELETE FROM "plan_features" WHERE "feature_key" = 'nfe';

      UPDATE "store_entitlements"
      SET "feature_key" = 'fiscal', "updated_at" = now()
      WHERE "feature_key" = 'nfe';

      UPDATE "store_entitlement_events"
      SET "feature_key" = 'fiscal', "updated_at" = now()
      WHERE "feature_key" = 'nfe';

      INSERT INTO "role_template_permissions" (
        "role_template_id", "permission_key"
      )
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
    `);
  });
  console.log("Fiscal catalog, entitlements, and permissions are normalized.");
}
