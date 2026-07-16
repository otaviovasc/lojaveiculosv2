import type { PermissionKey } from "@lojaveiculosv2/shared";
import type { SessionBootstrap } from "../account/apiClient";
import { readSessionEffectivePermissions } from "../account/sessionPermissions";

const checklistUpdatePermission =
  "inventory.checklist_update" satisfies PermissionKey;

export type ChecklistCapabilities = { canUpdate: boolean };

export function readChecklistCapabilities(
  session: SessionBootstrap | null,
): ChecklistCapabilities {
  return resolveChecklistCapabilities(readSessionEffectivePermissions(session));
}

export function resolveChecklistCapabilities(
  permissions: readonly string[] | undefined,
): ChecklistCapabilities {
  return {
    canUpdate: new Set(permissions).has(checklistUpdatePermission),
  };
}
