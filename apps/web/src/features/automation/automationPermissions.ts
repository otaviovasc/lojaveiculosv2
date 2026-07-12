import type { PermissionKey } from "@lojaveiculosv2/shared";
import type { SessionBootstrap } from "../account/apiClient";
import { readSessionEffectivePermissions } from "../account/sessionPermissions";

const automationPermissionKeys = {
  approve: "automation.approve",
  cancel: "automation.cancel",
  run: "automation.run",
} as const satisfies Record<string, PermissionKey>;

export type AutomationCapabilities = {
  canApprove: boolean;
  canCancel: boolean;
  canRun: boolean;
};

export function readAutomationCapabilities(
  session: SessionBootstrap | null,
): AutomationCapabilities {
  return resolveAutomationCapabilities(
    readSessionEffectivePermissions(session),
  );
}

export function resolveAutomationCapabilities(
  permissions: readonly string[] | undefined,
): AutomationCapabilities {
  const granted = new Set(permissions);
  return {
    canApprove: granted.has(automationPermissionKeys.approve),
    canCancel: granted.has(automationPermissionKeys.cancel),
    canRun: granted.has(automationPermissionKeys.run),
  };
}
