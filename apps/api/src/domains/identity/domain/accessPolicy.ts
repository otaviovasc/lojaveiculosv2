import type { PermissionKey, RoleKey } from "@lojaveiculosv2/shared";

const allPermissions = [
  "audit.read",
  "billing.manage",
  "crm.access",
  "crm.manage",
  "external_api.manage",
  "finance.attach_document",
  "finance.create",
  "finance.read",
  "finance.update",
  "fiscal.manage",
  "inventory.catalog_sync",
  "inventory.cost_create",
  "inventory.create",
  "inventory.delete",
  "inventory.document_attach",
  "inventory.media_delete",
  "inventory.media_update",
  "inventory.read",
  "inventory.reserve",
  "inventory.sell",
  "inventory.update_description",
  "inventory.update_price",
  "inventory.update_status",
  "inventory.update_unit",
  "lead.create",
  "lead.read",
  "lead.update",
  "store.manage",
  "store_profile.manage",
  "store_public_site.manage",
  "tenant.manage",
  "users.manage",
] satisfies PermissionKey[];

export const defaultRolePermissions: Record<RoleKey, readonly PermissionKey[]> =
  {
    agency: allPermissions,
    admin: [
      "crm.access",
      "crm.manage",
      "external_api.manage",
      "finance.attach_document",
      "finance.create",
      "finance.read",
      "finance.update",
      "fiscal.manage",
      "inventory.create",
      "inventory.delete",
      "inventory.document_attach",
      "inventory.media_delete",
      "inventory.media_update",
      "inventory.read",
      "inventory.reserve",
      "inventory.sell",
      "inventory.update_description",
      "inventory.update_price",
      "inventory.update_unit",
      "lead.create",
      "lead.read",
      "lead.update",
      "store.manage",
      "store_profile.manage",
      "store_public_site.manage",
      "users.manage",
    ],
    owner: allPermissions,
    salesman: [
      "crm.access",
      "finance.create",
      "finance.read",
      "inventory.create",
      "inventory.document_attach",
      "inventory.media_update",
      "inventory.read",
      "inventory.reserve",
      "inventory.update_description",
      "inventory.update_unit",
      "lead.create",
      "lead.read",
      "lead.update",
    ],
    supervisor: [
      "crm.access",
      "crm.manage",
      "finance.attach_document",
      "finance.create",
      "finance.read",
      "finance.update",
      "inventory.create",
      "inventory.document_attach",
      "inventory.media_delete",
      "inventory.media_update",
      "inventory.read",
      "inventory.reserve",
      "inventory.sell",
      "inventory.update_description",
      "inventory.update_price",
      "inventory.update_unit",
      "lead.create",
      "lead.read",
      "lead.update",
    ],
  };

export type PermissionOverride = {
  allowed: boolean;
  permission: PermissionKey;
};

export type PermissionDecision =
  | { allowed: true }
  | { allowed: false; reason: string };

export function resolvePermissions(input: {
  overrides?: readonly PermissionOverride[];
  role: RoleKey;
}): PermissionKey[] {
  const permissions = new Set(defaultRolePermissions[input.role]);

  for (const override of input.overrides ?? []) {
    if (override.allowed) {
      permissions.add(override.permission);
    } else {
      permissions.delete(override.permission);
    }
  }

  return [...permissions].sort();
}

export function canAccess(
  permissions: readonly string[],
  permission: PermissionKey,
): PermissionDecision {
  if (permissions.includes(permission)) {
    return { allowed: true };
  }

  return {
    allowed: false,
    reason: `Missing permission: ${permission}`,
  };
}
