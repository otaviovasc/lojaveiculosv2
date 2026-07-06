import type { SessionBootstrap } from "../account/apiClient";

const permissions = {
  assign: "crm.whatsapp.assign",
  close: "crm.whatsapp.close",
  connectionUpdateCredentials: "crm.whatsapp.connection.update_credentials",
  connectionUpdateMetadata: "crm.whatsapp.connection.update_metadata",
  connectionUpdateStatus: "crm.whatsapp.connection.update_status",
  connectionUpdateWebhooks: "crm.whatsapp.connection.update_webhooks",
  list: "crm.whatsapp.list",
  read: "crm.whatsapp.read",
  scheduleCancel: "crm.whatsapp.schedule.cancel",
  scheduleCreate: "crm.whatsapp.schedule.create",
  scheduleProcess: "crm.whatsapp.schedule.process",
  scheduleRead: "crm.whatsapp.schedule.read",
  send: "crm.whatsapp.send",
  tagAssign: "crm.whatsapp.tag.assign",
  tagManage: "crm.whatsapp.tag.manage",
  toggleIntervention: "crm.whatsapp.toggle_intervention",
} as const;

export type CrmWhatsappCapabilities = {
  canAssign: boolean;
  canClose: boolean;
  canConnectionManage: boolean;
  canList: boolean;
  canRead: boolean;
  canScheduleCancel: boolean;
  canScheduleCreate: boolean;
  canScheduleProcess: boolean;
  canScheduleRead: boolean;
  canSend: boolean;
  canTagAssign: boolean;
  canTagManage: boolean;
  canToggleIntervention: boolean;
};

export function readCrmWhatsappCapabilities(
  session: SessionBootstrap | null,
): CrmWhatsappCapabilities {
  return {
    canAssign: hasWhatsappPermission(session, permissions.assign),
    canClose: hasWhatsappPermission(session, permissions.close),
    canConnectionManage:
      hasWhatsappPermission(session, permissions.connectionUpdateCredentials) &&
      hasWhatsappPermission(session, permissions.connectionUpdateMetadata) &&
      hasWhatsappPermission(session, permissions.connectionUpdateStatus) &&
      hasWhatsappPermission(session, permissions.connectionUpdateWebhooks),
    canList: hasWhatsappPermission(session, permissions.list),
    canRead: hasWhatsappPermission(session, permissions.read),
    canScheduleCancel: hasWhatsappPermission(
      session,
      permissions.scheduleCancel,
    ),
    canScheduleCreate: hasWhatsappPermission(
      session,
      permissions.scheduleCreate,
    ),
    canScheduleProcess: hasWhatsappPermission(
      session,
      permissions.scheduleProcess,
    ),
    canScheduleRead: hasWhatsappPermission(session, permissions.scheduleRead),
    canSend: hasWhatsappPermission(session, permissions.send),
    canTagAssign: hasWhatsappPermission(session, permissions.tagAssign),
    canTagManage: hasWhatsappPermission(session, permissions.tagManage),
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
