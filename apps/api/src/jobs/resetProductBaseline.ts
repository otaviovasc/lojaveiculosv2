import type { PermissionKey, RoleKey } from "@lojaveiculosv2/shared";
import type { TransactionSql } from "postgres";
import { defaultRolePermissions } from "../domains/identity/domain/accessPolicy.js";

const PLAN_ID = "12121212-1212-4212-8212-121212121212";

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

const planFeatures = [
  ["analytics", 1, true, null, null],
  ["automation", 1, true, null, null],
  ["compliance", 1, true, null, null],
  ["crm", 0, false, null, null],
  ["custom_domain", 1, false, null, null],
  ["external_api", 0, false, null, null],
  ["marketplace", 0, false, null, null],
  ["fiscal", 0, false, null, null],
  ["plate_lookup", 1, true, 300, 10],
  ["simulations", 0, false, null, null],
  ["subdomain", 1, true, null, null],
] as const;

const addons = [
  [
    "15151515-1515-4515-8515-151515151515",
    "crm_whatsapp_instance",
    "crm",
    24999,
    "CRM WhatsApp",
  ],
  [
    "15151515-1515-4515-8515-151515151516",
    "marketplace_connectors",
    "marketplace",
    14990,
    "Marketplaces",
  ],
  [
    "15151515-1515-4515-8515-151515151517",
    "fiscal_spedy",
    "fiscal",
    19990,
    "Fiscal NF-e + NFS-e",
  ],
  [
    "15151515-1515-4515-8515-151515151518",
    "public_api_access",
    "external_api",
    9990,
    "API Pública",
  ],
  [
    "15151515-1515-4515-8515-151515151519",
    "simulations_pro",
    "simulations",
    4990,
    "Simulações Pro",
  ],
] as const;

const rolePermissions = roleTemplates.flatMap((role) =>
  [...new Set(defaultRolePermissions[role.roleKey])].map(
    (permissionKey: PermissionKey) => ({
      permission_key: permissionKey,
      role_template_id: role.id,
    }),
  ),
);

export async function seedProductBaseline(sql: TransactionSql): Promise<void> {
  await sql`
    INSERT INTO plans (
      id, catalog_version, code, is_default, limits,
      monthly_price_cents, name, status
    ) VALUES (
      ${PLAN_ID}, '2026-07-v1', 'growth', true,
      ${sql.json({ seller_limit: 8, vehicle_limit: 300 })},
      29900, 'Growth', 'active'
    )
  `;

  for (const [featureKey, included, trial, limit, trialLimit] of planFeatures) {
    await sql`
      INSERT INTO plan_features (
        feature_key, included, included_in_trial, limit_value, plan_id,
        trial_limit_value
      ) VALUES (
        ${featureKey}, ${included}, ${trial}, ${limit}, ${PLAN_ID}, ${trialLimit}
      )
    `;
  }

  for (const [id, code, featureKey, price, name] of addons) {
    await sql`
      INSERT INTO addons (
        id, catalog_version, code, feature_key, included_in_trial,
        monthly_price_cents, name, status
      ) VALUES (
        ${id}, '2026-07-v1', ${code}, ${featureKey}, false,
        ${price}, ${name}, 'active'
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
  addons: addons.length,
  planFeatures: planFeatures.length,
  plans: 1,
  roleTemplatePermissions: rolePermissions.length,
  roleTemplates: roleTemplates.length,
};
