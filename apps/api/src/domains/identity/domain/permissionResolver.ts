import type { PermissionKey, RoleKey } from "@lojaveiculosv2/shared";
import { defaultRolePermissions } from "./accessPolicy.js";

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

  return { allowed: false, reason: `Missing permission: ${permission}` };
}
