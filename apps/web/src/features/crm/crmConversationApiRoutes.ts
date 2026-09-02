import { createCrmEndpoint } from "./apiClient";
import type {
  CrmConnectionId,
  CrmListTagsInput,
  CrmWhatsappListCatalogProductsInput,
  CrmMessageQuery,
  CrmConversationCycleCountsQuery,
  CrmConversationCycleId,
  CrmConversationCycleQuery,
} from "./crmConversationTypes";
import type { CrmStatisticsQuery } from "./crmStatisticsTypes";

export const crmConversationRoutes = {
  statistics: (baseUrl?: string) =>
    createCrmEndpoint("/crm/statistics", baseUrl),
  assignCycle: (cycleId: CrmConversationCycleId, baseUrl?: string) =>
    createCrmEndpoint(
      `/crm/conversation-cycles/${encodeURIComponent(String(cycleId))}/actions/assign`,
      baseUrl,
    ),
  closeCycle: (cycleId: CrmConversationCycleId, baseUrl?: string) =>
    createCrmEndpoint(
      `/crm/conversation-cycles/${encodeURIComponent(String(cycleId))}/actions/close`,
      baseUrl,
    ),
  concludeCycle: (cycleId: CrmConversationCycleId, baseUrl?: string) =>
    createCrmEndpoint(
      `/crm/conversation-cycles/${encodeURIComponent(String(cycleId))}/actions/conclusion`,
      baseUrl,
    ),
  updateCycleAttendance: (cycleId: CrmConversationCycleId, baseUrl?: string) =>
    createCrmEndpoint(
      `/crm/conversation-cycles/${encodeURIComponent(String(cycleId))}/attendance`,
      baseUrl,
    ),
  markCycleRead: (cycleId: CrmConversationCycleId, baseUrl?: string) =>
    createCrmEndpoint(
      `/crm/conversation-cycles/${encodeURIComponent(String(cycleId))}/actions/read`,
      baseUrl,
    ),
  markCycleUnread: (cycleId: CrmConversationCycleId, baseUrl?: string) =>
    createCrmEndpoint(
      `/crm/conversation-cycles/${encodeURIComponent(String(cycleId))}/actions/unread`,
      baseUrl,
    ),
  catalogProducts: (baseUrl?: string) =>
    createCrmEndpoint("/crm/whatsapp/catalog/products", baseUrl),
  botIntegration: (baseUrl?: string) =>
    createCrmEndpoint("/crm/bot/configuration", baseUrl),
  // Keep the CrmRoutingService HTTP contract isolated here so route naming
  // never leaks into the Connections UI.
  routingPolicy: (baseUrl?: string) =>
    createCrmEndpoint("/crm/routing-policy", baseUrl),
  connections: (baseUrl?: string) =>
    createCrmEndpoint("/crm/channel-connections", baseUrl),
  connection: (connectionId: CrmConnectionId, baseUrl?: string) =>
    createCrmEndpoint(
      `/crm/channel-connections/${encodeURIComponent(String(connectionId))}`,
      baseUrl,
    ),
  composioAuthorize: (connectionId: CrmConnectionId, baseUrl?: string) =>
    createCrmEndpoint(
      `/crm/channel-connections/${encodeURIComponent(String(connectionId))}/composio/authorize`,
      baseUrl,
    ),
  composioComplete: (connectionId: CrmConnectionId, baseUrl?: string) =>
    createCrmEndpoint(
      `/crm/channel-connections/${encodeURIComponent(String(connectionId))}/composio/complete`,
      baseUrl,
    ),
  composioSender: (connectionId: CrmConnectionId, baseUrl?: string) =>
    createCrmEndpoint(
      `/crm/channel-connections/${encodeURIComponent(String(connectionId))}/composio/sender`,
      baseUrl,
    ),
  olxChatSetupRetry: (connectionId: CrmConnectionId, baseUrl?: string) =>
    createCrmEndpoint(
      `/crm/channel-connections/${encodeURIComponent(String(connectionId))}/olx-chat/setup/retry`,
      baseUrl,
    ),
  zapiPairingCode: (connectionId: CrmConnectionId, baseUrl?: string) =>
    createCrmEndpoint(
      `/crm/channel-connections/${encodeURIComponent(String(connectionId))}/zapi/pairing/code`,
      baseUrl,
    ),
  // UAZAPI routes mirror the Z-API setup contract exactly; the difference is
  // server-side provisioning, not the pairing/lifecycle surface.
  uazapiListInstances: (baseUrl?: string) =>
    createCrmEndpoint(
      "/crm/channel-connections/uazapi/list-instances",
      baseUrl,
    ),
  uazapiPairingCode: (connectionId: CrmConnectionId, baseUrl?: string) =>
    createCrmEndpoint(
      `/crm/channel-connections/${encodeURIComponent(String(connectionId))}/uazapi/pairing/code`,
      baseUrl,
    ),
  uazapiPairingQr: (connectionId: CrmConnectionId, baseUrl?: string) =>
    createCrmEndpoint(
      `/crm/channel-connections/${encodeURIComponent(String(connectionId))}/uazapi/pairing/qr`,
      baseUrl,
    ),
  uazapiDisconnect: (connectionId: CrmConnectionId, baseUrl?: string) =>
    createCrmEndpoint(
      `/crm/channel-connections/${encodeURIComponent(String(connectionId))}/uazapi/disconnect`,
      baseUrl,
    ),
  uazapiStatusRefresh: (connectionId: CrmConnectionId, baseUrl?: string) =>
    createCrmEndpoint(
      `/crm/channel-connections/${encodeURIComponent(String(connectionId))}/uazapi/status/refresh`,
      baseUrl,
    ),
  uazapiWebhooksConfigure: (connectionId: CrmConnectionId, baseUrl?: string) =>
    createCrmEndpoint(
      `/crm/channel-connections/${encodeURIComponent(String(connectionId))}/uazapi/webhooks/configure`,
      baseUrl,
    ),
  connectionMembers: (connectionId: CrmConnectionId, baseUrl?: string) =>
    createCrmEndpoint(
      `/crm/channel-connections/${encodeURIComponent(String(connectionId))}/members`,
      baseUrl,
    ),
  connectionMember: (
    connectionId: CrmConnectionId,
    userId: string,
    baseUrl?: string,
  ) =>
    createCrmEndpoint(
      `/crm/channel-connections/${encodeURIComponent(String(connectionId))}/members/${encodeURIComponent(userId)}`,
      baseUrl,
    ),
  zapiPairingQr: (connectionId: CrmConnectionId, baseUrl?: string) =>
    createCrmEndpoint(
      `/crm/channel-connections/${encodeURIComponent(String(connectionId))}/zapi/pairing/qr`,
      baseUrl,
    ),
  zapiDisconnect: (connectionId: CrmConnectionId, baseUrl?: string) =>
    createCrmEndpoint(
      `/crm/channel-connections/${encodeURIComponent(String(connectionId))}/zapi/disconnect`,
      baseUrl,
    ),
  zapiCredentials: (connectionId: CrmConnectionId, baseUrl?: string) =>
    createCrmEndpoint(
      `/crm/channel-connections/${encodeURIComponent(String(connectionId))}/zapi/credentials`,
      baseUrl,
    ),
  zapiReplacement: (connectionId: CrmConnectionId, baseUrl?: string) =>
    createCrmEndpoint(
      `/crm/channel-connections/${encodeURIComponent(String(connectionId))}/zapi/replacement`,
      baseUrl,
    ),
  zapiReplacementStatus: (
    connectionId: CrmConnectionId,
    operationId: string,
    baseUrl?: string,
  ) =>
    createCrmEndpoint(
      `/crm/channel-connections/${encodeURIComponent(String(connectionId))}/zapi/replacement/${encodeURIComponent(operationId)}`,
      baseUrl,
    ),
  zapiStatusRefresh: (connectionId: CrmConnectionId, baseUrl?: string) =>
    createCrmEndpoint(
      `/crm/channel-connections/${encodeURIComponent(String(connectionId))}/zapi/status/refresh`,
      baseUrl,
    ),
  zapiWebhooksConfigure: (connectionId: CrmConnectionId, baseUrl?: string) =>
    createCrmEndpoint(
      `/crm/channel-connections/${encodeURIComponent(String(connectionId))}/zapi/webhooks/configure`,
      baseUrl,
    ),
  conversationsStart: (baseUrl?: string) =>
    createCrmEndpoint("/crm/conversation-cycles/start", baseUrl),
  events: (baseUrl?: string) => createCrmEndpoint("/crm/events", baseUrl),
  eventsTicket: (baseUrl?: string) =>
    createCrmEndpoint("/crm/events/ticket", baseUrl),
  providerEventIssues: (baseUrl?: string) =>
    createCrmEndpoint("/crm/provider-events", baseUrl),
  messages: (cycleId: CrmConversationCycleId, baseUrl?: string) =>
    createCrmEndpoint(
      `/crm/conversation-cycles/${encodeURIComponent(String(cycleId))}/messages`,
      baseUrl,
    ),
  message: (messageId: string | number, baseUrl?: string) =>
    createCrmEndpoint(
      `/crm/messages/${encodeURIComponent(String(messageId))}`,
      baseUrl,
    ),
  messageReaction: (messageId: string | number, baseUrl?: string) =>
    createCrmEndpoint(
      `/crm/messages/${encodeURIComponent(String(messageId))}/reaction`,
      baseUrl,
    ),
  quickMessages: (baseUrl?: string) =>
    createCrmEndpoint("/crm/quick-messages", baseUrl),
  quickMessage: (quickMessageId: string, baseUrl?: string) =>
    createCrmEndpoint(
      `/crm/quick-messages/${encodeURIComponent(quickMessageId)}`,
      baseUrl,
    ),
  retryProviderEvent: (eventId: string, baseUrl?: string) =>
    createCrmEndpoint(
      `/crm/provider-events/${encodeURIComponent(eventId)}/retry`,
      baseUrl,
    ),
  scheduledMessage: (scheduledMessageId: string, baseUrl?: string) =>
    createCrmEndpoint(
      `/crm/scheduled-messages/${encodeURIComponent(scheduledMessageId)}`,
      baseUrl,
    ),
  scheduledMessages: (baseUrl?: string) =>
    createCrmEndpoint("/crm/scheduled-messages", baseUrl),
  scheduledMessagesProcessDue: (baseUrl?: string) =>
    createCrmEndpoint("/crm/scheduled-messages/process-due", baseUrl),
  conversationCycles: (baseUrl?: string) =>
    createCrmEndpoint("/crm/conversation-cycles", baseUrl),
  conversationCycleCounts: (baseUrl?: string) =>
    createCrmEndpoint("/crm/conversation-cycles/counts", baseUrl),
  cycleTag: (
    cycleId: CrmConversationCycleId,
    tagId: string,
    baseUrl?: string,
  ) =>
    createCrmEndpoint(
      `/crm/conversation-cycles/${encodeURIComponent(String(cycleId))}/tags/${encodeURIComponent(tagId)}`,
      baseUrl,
    ),
  cycleTags: (cycleId: CrmConversationCycleId, baseUrl?: string) =>
    createCrmEndpoint(
      `/crm/conversation-cycles/${encodeURIComponent(String(cycleId))}/tags`,
      baseUrl,
    ),
  tag: (tagId: string, baseUrl?: string) =>
    createCrmEndpoint(`/crm/tags/${encodeURIComponent(tagId)}`, baseUrl),
  tagsReorder: (baseUrl?: string) =>
    createCrmEndpoint("/crm/tags/reorder", baseUrl),
  tags: (baseUrl?: string) => createCrmEndpoint("/crm/tags", baseUrl),
  sendCatalog: (baseUrl?: string) =>
    createCrmEndpoint("/crm/whatsapp/send/catalog", baseUrl),
  sendCatalogProduct: (baseUrl?: string) =>
    createCrmEndpoint("/crm/whatsapp/send/catalog/product", baseUrl),
  sendLocation: (baseUrl?: string) =>
    createCrmEndpoint("/crm/whatsapp/send/location", baseUrl),
  sendMedia: (cycleId: CrmConversationCycleId, baseUrl?: string) =>
    createCrmEndpoint(
      `/crm/conversation-cycles/${encodeURIComponent(String(cycleId))}/messages/media`,
      baseUrl,
    ),
  sendQuickMessage: (quickMessageId: string, baseUrl?: string) =>
    createCrmEndpoint(
      `/crm/quick-messages/${encodeURIComponent(quickMessageId)}/send`,
      baseUrl,
    ),
  sendText: (cycleId: CrmConversationCycleId, baseUrl?: string) =>
    createCrmEndpoint(
      `/crm/conversation-cycles/${encodeURIComponent(String(cycleId))}/messages`,
      baseUrl,
    ),
  sendVehicle: (baseUrl?: string) =>
    createCrmEndpoint("/crm/whatsapp/send/vehicle", baseUrl),
} as const;

export function createCrmStatisticsQuery(query: CrmStatisticsQuery) {
  const params = new URLSearchParams();
  addOptionalParam(params, "connectionId", query.connectionId);
  addOptionalParam(params, "from", query.from);
  addOptionalParam(params, "toExclusive", query.toExclusive);
  return params;
}

export function createCrmConversationCyclesQuery(
  query: CrmConversationCycleQuery = {},
) {
  const params = new URLSearchParams();
  addOptionalParam(params, "assigneeId", query.assigneeId);
  addOptionalParam(params, "connectionId", query.connectionId);
  addOptionalParam(params, "filter", query.filter);
  addOptionalParam(params, "humanAttendanceState", query.humanAttendanceState);
  addOptionalParam(params, "leadId", query.leadId);
  addOptionalParam(params, "limit", query.limit);
  addOptionalParam(params, "offset", query.offset);
  addOptionalParam(params, "search", query.search);
  addOptionalParam(params, "cycleId", query.cycleId);
  addOptionalParam(params, "status", query.status);
  addOptionalParam(params, "tagIds", query.tagIds?.join(","));
  addOptionalParam(params, "unreadOnly", query.unreadOnly);
  return params;
}

export function createCrmConversationCycleCountsQuery(
  query: CrmConversationCycleCountsQuery = {},
) {
  const params = new URLSearchParams();
  addOptionalParam(params, "connectionId", query.connectionId);
  addOptionalParam(params, "filter", query.filter);
  addOptionalParam(params, "humanAttendanceState", query.humanAttendanceState);
  addOptionalParam(params, "leadId", query.leadId);
  addOptionalParam(params, "search", query.search);
  addOptionalParam(params, "status", query.status);
  addOptionalParam(params, "tagIds", query.tagIds?.join(","));
  addOptionalParam(params, "unreadOnly", query.unreadOnly);
  return params;
}

export function createCrmMessageQuery(query: CrmMessageQuery = {}) {
  const params = new URLSearchParams();
  addOptionalParam(params, "connectionId", query.connectionId);
  addOptionalParam(params, "limit", query.limit);
  addOptionalParam(params, "offset", query.offset);
  return params;
}

export function createCrmWhatsappCatalogProductsQuery(
  input: CrmWhatsappListCatalogProductsInput,
) {
  const params = new URLSearchParams();
  addOptionalParam(params, "catalogPhone", input.catalogPhone);
  addOptionalParam(params, "nextCursor", input.nextCursor);
  addOptionalParam(params, "cycleId", input.cycleId);
  return params;
}

export function createCrmTagsQuery(input: CrmListTagsInput = {}) {
  const params = new URLSearchParams();
  addOptionalParam(params, "connectionId", input.connectionId ?? undefined);
  addOptionalParam(params, "search", input.search);
  return params;
}

export function createCrmScheduledMessagesQuery(
  input: {
    connectionId?: CrmConnectionId;
    limit?: number;
    cycleId?: CrmConversationCycleId;
    status?: string;
  } = {},
) {
  const params = new URLSearchParams();
  addOptionalParam(params, "connectionId", input.connectionId);
  addOptionalParam(params, "limit", input.limit);
  addOptionalParam(params, "cycleId", input.cycleId);
  addOptionalParam(params, "status", input.status);
  return params;
}

export function withQuery(route: string, params: URLSearchParams[]) {
  const query = params
    .map((param) => param.toString())
    .filter(Boolean)
    .join("&");
  return query ? `${route}?${query}` : route;
}

function addOptionalParam(
  params: URLSearchParams,
  key: string,
  value:
    | boolean
    | CrmConnectionId
    | CrmConversationCycleId
    | number
    | string
    | undefined,
) {
  if (value !== undefined && value !== "") params.set(key, String(value));
}
