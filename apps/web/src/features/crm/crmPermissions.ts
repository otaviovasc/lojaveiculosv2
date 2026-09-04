import type { SessionBootstrap } from "../account/apiClient";
import { readSessionActiveStore } from "../account/sessionPermissions";

const permissions = {
  assign: "crm.conversations.assign",
  campaignManage: "crm.campaigns.manage",
  campaignRead: "crm.campaigns.read",
  close: "crm.conversations.manage",
  connectionPair: "crm.messaging.connection.pair",
  connectionSetup: "crm.messaging.connection.setup",
  connectionCredentialsManage: "crm.messaging.credentials.rotate",
  botManage: "crm.bot.manage",
  botRead: "crm.bot.read",
  list: "crm.conversations.read",
  read: "crm.conversations.read",
  readUnassigned: "crm.conversations.read_unassigned",
  routingDefaultManage: "crm.routing.default.manage",
  scheduleCancel: "crm.scheduled_messages.cancel",
  scheduleCreate: "crm.scheduled_messages.create",
  scheduleProcess: "crm.scheduled_messages.process",
  scheduleRead: "crm.scheduled_messages.read",
  send: "crm.messages.send",
  tagAssign: "crm.tags.assign",
  tagManage: "crm.tags.manage",
  toggleIntervention: "crm.attendances.manage",
  visitsManage: "crm.visits.manage",
  visitsRead: "crm.visits.read",
} as const;

export type CrmCapabilities = {
  canAssign: boolean;
  canCampaignManage: boolean;
  canCampaignRead: boolean;
  canClose: boolean;
  canConnectionPair: boolean;
  canConnectionCredentialsManage: boolean;
  canConnectionSetup: boolean;
  canIntegrationsManage: boolean;
  canList: boolean;
  canRead: boolean;
  canReadUnassigned: boolean;
  canRoutingDefaultManage: boolean;
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

export function readCrmCapabilities(
  cycle: SessionBootstrap | null,
): CrmCapabilities {
  return {
    canAssign: hasCrmPermission(cycle, permissions.assign),
    canCampaignManage: hasCrmPermission(cycle, permissions.campaignManage),
    canCampaignRead: hasCrmPermission(cycle, permissions.campaignRead),
    canClose: hasCrmPermission(cycle, permissions.close),
    canConnectionPair: hasCrmPermission(cycle, permissions.connectionPair),
    canConnectionCredentialsManage:
      hasCrmPermission(cycle, permissions.connectionSetup) &&
      hasCrmPermission(cycle, permissions.connectionCredentialsManage),
    canConnectionSetup: hasCrmPermission(cycle, permissions.connectionSetup),
    canIntegrationsManage:
      hasCrmPermission(cycle, permissions.connectionSetup) ||
      hasCrmPermission(cycle, permissions.botManage),
    canList: hasCrmPermission(cycle, permissions.list),
    canRead: hasCrmPermission(cycle, permissions.read),
    canReadUnassigned: hasCrmPermission(cycle, permissions.readUnassigned),
    canRoutingDefaultManage: hasCrmPermission(
      cycle,
      permissions.routingDefaultManage,
    ),
    canScheduleCancel: hasCrmPermission(cycle, permissions.scheduleCancel),
    canScheduleCreate: hasCrmPermission(cycle, permissions.scheduleCreate),
    canScheduleProcess: hasCrmPermission(cycle, permissions.scheduleProcess),
    canScheduleRead: hasCrmPermission(cycle, permissions.scheduleRead),
    canSend: hasCrmPermission(cycle, permissions.send),
    canTagAssign: hasCrmPermission(cycle, permissions.tagAssign),
    canTagManage: hasCrmPermission(cycle, permissions.tagManage),
    canToggleIntervention: hasCrmPermission(
      cycle,
      permissions.toggleIntervention,
    ),
    canVisitsManage: hasCrmPermission(cycle, permissions.visitsManage),
    canVisitsRead: hasCrmPermission(cycle, permissions.visitsRead),
  };
}

export function hasCrmPermission(
  cycle: SessionBootstrap | null,
  permission: (typeof permissions)[keyof typeof permissions],
) {
  const store = readSessionActiveStore(cycle);
  return Boolean(store?.effectivePermissions?.includes(permission));
}

export function hasCrmConversationAccess(permissions: readonly string[]) {
  return permissions.includes("crm.conversations.read");
}
