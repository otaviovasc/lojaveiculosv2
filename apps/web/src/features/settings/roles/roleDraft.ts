import type { RoleKey, RoleManagementView, RoleMemberView } from "../types";

export type OverrideMode = "allow" | "deny" | "inherit";

export type Draft = {
  overrides: Map<string, OverrideMode>;
  role: RoleKey;
};

export function createDraft(member: RoleMemberView | undefined): Draft {
  const overrides = new Map<string, OverrideMode>();
  for (const override of member?.overrides ?? []) {
    overrides.set(override.permission, override.allowed ? "allow" : "deny");
  }
  return { overrides, role: member?.role ?? "salesman" };
}

export function createOverrides(draft: Draft) {
  return [...draft.overrides.entries()].map(([permission, mode]) => ({
    allowed: mode === "allow",
    permission,
    reason: "role_management_tri_state",
  }));
}

export function summarizeDraft(draft: Draft, roles: RoleManagementView) {
  const base = new Set(
    roles.roles.find((role) => role.role === draft.role)?.defaultPermissions ??
      [],
  );
  let active = 0;
  for (const group of roles.permissionGroups) {
    for (const permission of group.permissions) {
      const mode = draft.overrides.get(permission.key) ?? "inherit";
      if (mode === "allow" || (mode === "inherit" && base.has(permission.key)))
        active += 1;
    }
  }
  return {
    active,
    allowed: [...draft.overrides.values()].filter((mode) => mode === "allow")
      .length,
    denied: [...draft.overrides.values()].filter((mode) => mode === "deny")
      .length,
  };
}
