import type { SessionBootstrap } from "../account/apiClient";

const permissions = {
  assign: "crm.whatsapp.assign",
  close: "crm.whatsapp.close",
  list: "crm.whatsapp.list",
  read: "crm.whatsapp.read",
  send: "crm.whatsapp.send",
  toggleIntervention: "crm.whatsapp.toggle_intervention",
} as const;

export type CrmWhatsappCapabilities = {
  canAssign: boolean;
  canClose: boolean;
  canList: boolean;
  canRead: boolean;
  canSend: boolean;
  canToggleIntervention: boolean;
};

export function readCrmWhatsappCapabilities(
  session: SessionBootstrap | null,
): CrmWhatsappCapabilities {
  return {
    canAssign: hasWhatsappPermission(session, permissions.assign),
    canClose: hasWhatsappPermission(session, permissions.close),
    canList: hasWhatsappPermission(session, permissions.list),
    canRead: hasWhatsappPermission(session, permissions.read),
    canSend: hasWhatsappPermission(session, permissions.send),
    canToggleIntervention: hasWhatsappPermission(
      session,
      permissions.toggleIntervention,
    ),
  };
}

export function hasWhatsappPermission(
  session: SessionBootstrap | null,
  permission: (typeof permissions)[keyof typeof permissions],
) {
  return Boolean(
    session?.defaultStore?.effectivePermissions?.includes(permission),
  );
}

export function hasWhatsappQueueAccess(permissions: readonly string[]) {
  return (
    permissions.includes("crm.whatsapp.list") ||
    permissions.includes("crm.whatsapp.read")
  );
}
