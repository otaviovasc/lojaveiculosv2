import type { PermissionKey, RoleKey } from "@lojaveiculosv2/shared";
import type { TransactionSql } from "postgres";
import { currentBillingCatalog } from "../domains/billing/catalog/currentBillingCatalog.js";
import {
  assertBillingCatalogIsPublished,
  assertValidBillingCatalog,
  billingCatalogChecksum,
  canonicalBillingCatalogJson,
} from "../domains/billing/catalog/billingCatalogIntegrity.js";
import { defaultRolePermissions } from "../domains/identity/domain/accessPolicy.js";

const roleTemplates: ReadonlyArray<{
  description: string;
  id: string;
  name: string;
  roleKey: RoleKey;
}> = [
  {
    description:
      "Platform operations role; normal store assignment remains disabled.",
    id: "11111111-1111-4111-8111-111111111111",
    name: "Admin",
    roleKey: "admin",
  },
  {
    description: "Agency role with full cross-store administration.",
    id: "22222222-2222-4222-8222-222222222222",
    name: "Agency",
    roleKey: "agency",
  },
  {
    description: "Store owner with full store administration.",
    id: "55555555-5555-4555-8555-555555555555",
    name: "Owner",
    roleKey: "owner",
  },
  {
    description: "Supervisor role for operational management.",
    id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
    name: "Supervisor",
    roleKey: "supervisor",
  },
  {
    description: "Sales role for inventory and CRM execution.",
    id: "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
    name: "Salesman",
    roleKey: "salesman",
  },
  {
    description:
      "Investor role for read-only financial and operational visibility.",
    id: "eeeeeeee-1111-4eee-8eee-eeeeeeeeeeee",
    name: "Investor",
    roleKey: "investor",
  },
];

const rolePermissions = roleTemplates.flatMap((role) =>
  [...new Set(defaultRolePermissions[role.roleKey])].map(
    (permissionKey: PermissionKey) => ({
      permission_key: permissionKey,
      role_template_id: role.id,
    }),
  ),
);

export async function seedProductBaseline(sql: TransactionSql): Promise<void> {
  assertValidBillingCatalog(currentBillingCatalog);
  assertBillingCatalogIsPublished(currentBillingCatalog, new Date());
  const checksum = billingCatalogChecksum(currentBillingCatalog);
  const publishedAt = new Date(currentBillingCatalog.publishedAt);
  await sql`
    INSERT INTO billing_catalog_versions (
      activated_at, checksum, definition, published_at, status, version
    ) VALUES (
      now(), ${checksum},
      ${sql.json(JSON.parse(canonicalBillingCatalogJson(currentBillingCatalog)))},
      ${publishedAt}, 'active', ${currentBillingCatalog.version}
    )
  `;

  for (const plan of currentBillingCatalog.plans) {
    await sql`
      INSERT INTO plans (
        id, catalog_version, code, is_default, limits,
        monthly_price_cents, name, published_at, status
      ) VALUES (
        ${plan.id}, ${currentBillingCatalog.version}, ${plan.code},
        ${plan.isDefault},
        ${sql.json({
          seller_limit: plan.limits.sellerLimit,
          vehicle_limit: plan.limits.vehicleLimit,
        })},
        ${plan.monthlyPriceCents}, ${plan.name}, ${publishedAt}, ${plan.status}
      )
    `;
  }

  for (const plan of currentBillingCatalog.plans) {
    for (const feature of plan.features) {
      await sql`
      INSERT INTO plan_features (
        feature_key, included, included_in_trial, limit_value, plan_id,
        trial_limit_value
      ) VALUES (
          ${feature.featureKey}, ${feature.included ? 1 : 0},
          ${feature.includedInTrial}, ${feature.limitValue}, ${plan.id},
          ${feature.trialLimitValue}
      )
    `;
    }
  }

  for (const addon of currentBillingCatalog.addons) {
    await sql`
      INSERT INTO addons (
        id, catalog_version, code, feature_key, included_in_trial,
        limits, monthly_price_cents, name, published_at, status
      ) VALUES (
        ${addon.id}, ${currentBillingCatalog.version}, ${addon.code},
        ${addon.featureKey}, ${addon.includedInTrial},
        ${sql.json(toDatabaseAddonLimits(addon.limits))},
        ${addon.monthlyPriceCents}, ${addon.name}, ${publishedAt}, ${addon.status}
      )
    `;
  }

  for (const role of roleTemplates) {
    await sql`
      INSERT INTO role_templates (
        id, description, is_system, name, role_key
      ) VALUES (
        ${role.id}, ${role.description}, true, ${role.name}, ${role.roleKey}
      )
    `;
  }

  await sql`
    INSERT INTO role_template_permissions ${sql(
      rolePermissions,
      "permission_key",
      "role_template_id",
    )}
    ON CONFLICT (role_template_id, permission_key) DO NOTHING
  `;
}

export const productBaselineCounts = {
  addons: currentBillingCatalog.addons.length,
  billingCatalogVersions: 1,
  planFeatures: currentBillingCatalog.plans.reduce(
    (count, plan) => count + plan.features.length,
    0,
  ),
  plans: currentBillingCatalog.plans.length,
  roleTemplatePermissions: rolePermissions.length,
  roleTemplates: roleTemplates.length,
};

function toDatabaseAddonLimits(
  limits: (typeof currentBillingCatalog.addons)[number]["limits"],
) {
  return {
    ...(limits.composioToolExecutionsPerBillingMonth !== undefined
      ? {
          composio_tool_executions_per_billing_month:
            limits.composioToolExecutionsPerBillingMonth,
        }
      : {}),
    ...(limits.enforcement !== undefined
      ? { enforcement: limits.enforcement }
      : {}),
    ...(limits.includedChannels !== undefined
      ? { included_channels: [...limits.includedChannels] }
      : {}),
  };
}
