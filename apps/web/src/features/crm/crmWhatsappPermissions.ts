import type { SessionBootstrap } from "../account/apiClient";

const permissions = {
  assign: "crm.whatsapp.assign",
  close: "crm.whatsapp.close",
  connectionManage: "crm.whatsapp.connection.manage",
  integrationsManage: "crm.whatsapp.integrations.manage",
  list: "crm.whatsapp.list",
  read: "crm.whatsapp.read",
  scheduleCancel: "crm.whatsapp.schedules.cancel",
  scheduleCreate: "crm.whatsapp.schedules.create",
  scheduleProcess: "crm.whatsapp.schedules.process",
  scheduleRead: "crm.whatsapp.schedules.read",
  send: "crm.whatsapp.send",
  tagAssign: "crm.whatsapp.tags.assign",
  tagManage: "crm.whatsapp.tags.manage",
  toggleIntervention: "crm.whatsapp.toggle_intervention",
  visitsManage: "crm.visits.manage",
  visitsRead: "crm.visits.read",
} as const;

export type CrmWhatsappCapabilities = {
  canAssign: boolean;
  canClose: boolean;
  canConnectionManage: boolean;
  canIntegrationsManage: boolean;
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
  canVisitsManage: boolean;
  canVisitsRead: boolean;
};

export function readCrmWhatsappCapabilities(
  session: SessionBootstrap | null,
): CrmWhatsappCapabilities {
  return {
    canAssign: hasWhatsappPermission(session, permissions.assign),
    canClose: hasWhatsappPermission(session, permissions.close),
    canConnectionManage: hasWhatsappPermission(
      session,
      permissions.connectionManage,
    ),
    canIntegrationsManage: hasWhatsappPermission(
      session,
      permissions.integrationsManage,
    ),
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
    canVisitsManage: hasWhatsappPermission(session, permissions.visitsManage),
    canVisitsRead: hasWhatsappPermission(session, permissions.visitsRead),
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
