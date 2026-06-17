import type { PermissionKey, RoleKey } from "@lojaveiculosv2/shared";

const allPermissions = [
  "audit.read",
  "billing.manage",
  "crm.access",
  "crm.manage",
  "external_api.manage",
  "fiscal.manage",
  "inventory.create",
  "inventory.delete",
  "inventory.read",
  "inventory.update_description",
  "inventory.update_price",
  "inventory.update_status",
  "store.manage",
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
      "fiscal.manage",
      "inventory.create",
      "inventory.delete",
      "inventory.read",
      "inventory.update_description",
      "inventory.update_price",
      "store.manage",
      "users.manage",
    ],
    owner: allPermissions,
    salesman: [
      "crm.access",
      "inventory.create",
      "inventory.read",
      "inventory.update_description",
    ],
    supervisor: [
      "crm.access",
      "crm.manage",
      "inventory.create",
      "inventory.read",
      "inventory.update_description",
      "inventory.update_price",
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
