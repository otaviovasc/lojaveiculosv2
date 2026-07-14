import type { SessionBootstrap } from "../account/apiClient";
import { readSessionEffectivePermissions } from "../account/sessionPermissions";

export type AutoEntryCapabilities = { canManage: boolean };

export function readAutoEntryCapabilities(
  session: SessionBootstrap | null,
): AutoEntryCapabilities {
  return resolveAutoEntryCapabilities(readSessionEffectivePermissions(session));
}

export function resolveAutoEntryCapabilities(
  permissions: readonly string[] | undefined,
): AutoEntryCapabilities {
  return {
    canManage: new Set(permissions).has("finance.auto_entries.manage"),
  };
}
