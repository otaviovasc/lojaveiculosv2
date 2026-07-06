import { createCrmEndpoint } from "./apiClient";
import type {
  CrmWhatsappConnectionId,
  CrmWhatsappListTagsInput,
  CrmWhatsappListCatalogProductsInput,
  CrmWhatsappMessageQuery,
  CrmWhatsappSessionCountsQuery,
  CrmWhatsappSessionId,
  CrmWhatsappSessionQuery,
} from "./crmWhatsappTypes";

export const crmWhatsappRoutes = {
  assignSession: (sessionId: CrmWhatsappSessionId, baseUrl?: string) =>
    createCrmEndpoint(
      `/crm/whatsapp/sessions/${encodeURIComponent(String(sessionId))}/assign`,
      baseUrl,
    ),
  closeSession: (sessionId: CrmWhatsappSessionId, baseUrl?: string) =>
    createCrmEndpoint(
      `/crm/whatsapp/sessions/${encodeURIComponent(String(sessionId))}/close`,
      baseUrl,
    ),
  interveneSession: (sessionId: CrmWhatsappSessionId, baseUrl?: string) =>
    createCrmEndpoint(
      `/crm/whatsapp/sessions/${encodeURIComponent(String(sessionId))}/intervention`,
      baseUrl,
    ),
  markSessionRead: (sessionId: CrmWhatsappSessionId, baseUrl?: string) =>
    createCrmEndpoint(
      `/crm/whatsapp/sessions/${encodeURIComponent(String(sessionId))}/read`,
      baseUrl,
    ),
  markSessionUnread: (sessionId: CrmWhatsappSessionId, baseUrl?: string) =>
    createCrmEndpoint(
      `/crm/whatsapp/sessions/${encodeURIComponent(String(sessionId))}/unread`,
      baseUrl,
    ),
  catalogProducts: (baseUrl?: string) =>
    createCrmEndpoint("/crm/whatsapp/catalog/products", baseUrl),
  connections: (baseUrl?: string) =>
    createCrmEndpoint("/crm/whatsapp/connections", baseUrl),
  connection: (connectionId: CrmWhatsappConnectionId, baseUrl?: string) =>
    createCrmEndpoint(
      `/crm/whatsapp/connections/${encodeURIComponent(String(connectionId))}`,
      baseUrl,
    ),
  conversationsStart: (baseUrl?: string) =>
    createCrmEndpoint("/crm/whatsapp/conversations/start", baseUrl),
  events: (baseUrl?: string) =>
    createCrmEndpoint("/crm/whatsapp/events", baseUrl),
  eventsTicket: (baseUrl?: string) =>
    createCrmEndpoint("/crm/whatsapp/events/ticket", baseUrl),
  providerEventIssues: (baseUrl?: string) =>
    createCrmEndpoint("/crm/whatsapp/provider-events/issues", baseUrl),
  messages: (sessionId: CrmWhatsappSessionId, baseUrl?: string) =>
    createCrmEndpoint(`/crm/whatsapp/messages/${sessionId}`, baseUrl),
  message: (messageId: string | number, baseUrl?: string) =>
    createCrmEndpoint(
      `/crm/whatsapp/messages/${encodeURIComponent(String(messageId))}`,
      baseUrl,
    ),
  messageReaction: (messageId: string | number, baseUrl?: string) =>
    createCrmEndpoint(
      `/crm/whatsapp/messages/${encodeURIComponent(String(messageId))}/reaction`,
      baseUrl,
    ),
  quickMessages: (baseUrl?: string) =>
    createCrmEndpoint("/crm/whatsapp/quick-messages", baseUrl),
  quickMessage: (quickMessageId: string, baseUrl?: string) =>
    createCrmEndpoint(
      `/crm/whatsapp/quick-messages/${encodeURIComponent(quickMessageId)}`,
      baseUrl,
    ),
  retryProviderEvent: (eventId: string, baseUrl?: string) =>
    createCrmEndpoint(
      `/crm/whatsapp/provider-events/${encodeURIComponent(eventId)}/retry`,
      baseUrl,
    ),
  scheduledMessage: (scheduledMessageId: string, baseUrl?: string) =>
    createCrmEndpoint(
      `/crm/whatsapp/scheduled-messages/${encodeURIComponent(scheduledMessageId)}`,
      baseUrl,
    ),
  scheduledMessages: (baseUrl?: string) =>
    createCrmEndpoint("/crm/whatsapp/scheduled-messages", baseUrl),
  scheduledMessagesProcessDue: (baseUrl?: string) =>
    createCrmEndpoint("/crm/whatsapp/scheduled-messages/process-due", baseUrl),
  sessions: (baseUrl?: string) =>
    createCrmEndpoint("/crm/whatsapp/sessions", baseUrl),
  sessionCounts: (baseUrl?: string) =>
    createCrmEndpoint("/crm/whatsapp/session-counts", baseUrl),
  sessionTag: (
    sessionId: CrmWhatsappSessionId,
    tagId: string,
    baseUrl?: string,
  ) =>
    createCrmEndpoint(
      `/crm/whatsapp/sessions/${encodeURIComponent(String(sessionId))}/tags/${encodeURIComponent(tagId)}`,
      baseUrl,
    ),
  sessionTags: (sessionId: CrmWhatsappSessionId, baseUrl?: string) =>
    createCrmEndpoint(
      `/crm/whatsapp/sessions/${encodeURIComponent(String(sessionId))}/tags`,
      baseUrl,
    ),
  tag: (tagId: string, baseUrl?: string) =>
    createCrmEndpoint(
      `/crm/whatsapp/tags/${encodeURIComponent(tagId)}`,
      baseUrl,
    ),
  tagsReorder: (baseUrl?: string) =>
    createCrmEndpoint("/crm/whatsapp/tags/reorder", baseUrl),
  tags: (baseUrl?: string) => createCrmEndpoint("/crm/whatsapp/tags", baseUrl),
  sendCatalog: (baseUrl?: string) =>
    createCrmEndpoint("/crm/whatsapp/send/catalog", baseUrl),
  sendCatalogProduct: (baseUrl?: string) =>
    createCrmEndpoint("/crm/whatsapp/send/catalog/product", baseUrl),
  sendLocation: (baseUrl?: string) =>
    createCrmEndpoint("/crm/whatsapp/send/location", baseUrl),
  sendMedia: (baseUrl?: string) =>
    createCrmEndpoint("/crm/whatsapp/send/media", baseUrl),
  sendQuickMessage: (quickMessageId: string, baseUrl?: string) =>
    createCrmEndpoint(
      `/crm/whatsapp/quick-messages/${encodeURIComponent(quickMessageId)}/send`,
      baseUrl,
    ),
  sendText: (baseUrl?: string) =>
    createCrmEndpoint("/crm/whatsapp/send/text", baseUrl),
  sendVehicle: (baseUrl?: string) =>
    createCrmEndpoint("/crm/whatsapp/send/vehicle", baseUrl),
} as const;

export function createCrmWhatsappSessionQuery(
  query: CrmWhatsappSessionQuery = {},
) {
  const params = new URLSearchParams();
  addOptionalParam(params, "connectionId", query.connectionId);
  addOptionalParam(params, "filter", query.filter);
  addOptionalParam(params, "leadId", query.leadId);
  addOptionalParam(params, "limit", query.limit);
  addOptionalParam(params, "offset", query.offset);
  addOptionalParam(params, "search", query.search);
  addOptionalParam(params, "sessionId", query.sessionId);
  addOptionalParam(params, "status", query.status);
  addOptionalParam(params, "tagIds", query.tagIds?.join(","));
  addOptionalParam(params, "unreadOnly", query.unreadOnly);
  return params;
}

export function createCrmWhatsappSessionCountsQuery(
  query: CrmWhatsappSessionCountsQuery = {},
) {
  const params = new URLSearchParams();
  addOptionalParam(params, "connectionId", query.connectionId);
  addOptionalParam(params, "filter", query.filter);
  addOptionalParam(params, "leadId", query.leadId);
  addOptionalParam(params, "search", query.search);
  addOptionalParam(params, "status", query.status);
  addOptionalParam(params, "tagIds", query.tagIds?.join(","));
  addOptionalParam(params, "unreadOnly", query.unreadOnly);
  return params;
}

export function createCrmWhatsappMessageQuery(
  query: CrmWhatsappMessageQuery = {},
) {
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
  addOptionalParam(params, "sessionId", input.sessionId);
  return params;
}

export function createCrmWhatsappTagsQuery(
  input: CrmWhatsappListTagsInput = {},
) {
  const params = new URLSearchParams();
  addOptionalParam(params, "connectionId", input.connectionId ?? undefined);
  addOptionalParam(params, "search", input.search);
  return params;
}

export function createCrmWhatsappScheduledMessagesQuery(
  input: {
    connectionId?: CrmWhatsappConnectionId;
    limit?: number;
    sessionId?: CrmWhatsappSessionId;
    status?: string;
  } = {},
) {
  const params = new URLSearchParams();
  addOptionalParam(params, "connectionId", input.connectionId);
  addOptionalParam(params, "limit", input.limit);
  addOptionalParam(params, "sessionId", input.sessionId);
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
    | CrmWhatsappConnectionId
    | CrmWhatsappSessionId
    | number
    | string
    | undefined,
) {
  if (value !== undefined && value !== "") params.set(key, String(value));
}
