import { readApiJson } from "../../lib/apiErrors";
import { createProductCrmHeaders } from "./productCrmApi";
import type { ProductCrmAuth } from "./productCrmTypes";
import type {
  CrmWhatsappAddSessionTagInput,
  CrmWhatsappAssignSessionInput,
  CrmWhatsappCatalogProductsPage,
  CrmWhatsappCreateQuickMessageInput,
  CrmWhatsappSendCatalogInput,
  CrmWhatsappListCatalogProductsInput,
  CrmWhatsappListTagsInput,
  CrmWhatsappConnectionId,
  CrmWhatsappInterventionInput,
  CrmWhatsappMessageQuery,
  CrmWhatsappMessage,
  CrmWhatsappConnectionsResponse,
  CrmWhatsappProviderEventsResponse,
  CrmWhatsappQuickMessage,
  CrmWhatsappRealtimeEvent,
  CrmWhatsappRetryProviderEventResponse,
  CrmWhatsappSendLocationInput,
  CrmWhatsappSendMediaInput,
  CrmWhatsappSendCatalogProductInput,
  CrmWhatsappSendQuickMessageInput,
  CrmWhatsappSendReactionInput,
  CrmWhatsappSendTextInput,
  CrmWhatsappSendVehicleInput,
  CrmWhatsappSession,
  CrmWhatsappSessionCounts,
  CrmWhatsappSessionCountsQuery,
  CrmWhatsappSessionId,
  CrmWhatsappSessionQuery,
  CrmWhatsappStartConversationInput,
  CrmWhatsappStartConversationResult,
  CrmWhatsappTag,
  CrmWhatsappUpdateQuickMessageInput,
} from "./crmWhatsappTypes";
import {
  createCrmWhatsappCatalogProductsQuery,
  createCrmWhatsappMessageQuery,
  createCrmWhatsappSessionCountsQuery,
  createCrmWhatsappSessionQuery,
  createCrmWhatsappTagsQuery,
  crmWhatsappRoutes,
  withQuery,
} from "./crmWhatsappApiRoutes";
import { subscribeCrmWhatsappEvents } from "./crmWhatsappRealtimeApi";

export {
  createCrmWhatsappSessionQuery,
  crmWhatsappRoutes,
} from "./crmWhatsappApiRoutes";

export type CrmWhatsappApi = {
  assignSession: (
    sessionId: CrmWhatsappSessionId,
    input: CrmWhatsappAssignSessionInput,
  ) => Promise<CrmWhatsappSession | null>;
  closeSession: (
    sessionId: CrmWhatsappSessionId,
  ) => Promise<CrmWhatsappSession | null>;
  interveneSession: (
    sessionId: CrmWhatsappSessionId,
    input: CrmWhatsappInterventionInput,
  ) => Promise<CrmWhatsappSession | null>;
  markSessionRead: (
    sessionId: CrmWhatsappSessionId,
  ) => Promise<CrmWhatsappSession | null>;
  markSessionUnread: (
    sessionId: CrmWhatsappSessionId,
  ) => Promise<CrmWhatsappSession | null>;
  listConnections: () => Promise<CrmWhatsappConnectionsResponse>;
  deleteMessage: (
    messageId: CrmWhatsappMessage["id"],
  ) => Promise<CrmWhatsappMessage | null>;
  listMessages: (
    sessionId: CrmWhatsappSessionId,
    query?: Omit<CrmWhatsappMessageQuery, "connectionId">,
  ) => Promise<CrmWhatsappMessage[]>;
  listSessions: (
    query?: CrmWhatsappSessionQuery,
  ) => Promise<CrmWhatsappSession[]>;
  listSessionCounts: (
    query?: CrmWhatsappSessionCountsQuery,
  ) => Promise<CrmWhatsappSessionCounts>;
  sendMedia: (input: CrmWhatsappSendMediaInput) => Promise<CrmWhatsappMessage>;
  removeReaction: (
    messageId: CrmWhatsappMessage["id"],
  ) => Promise<CrmWhatsappMessage | null>;
  sendReaction: (
    messageId: CrmWhatsappMessage["id"],
    input: CrmWhatsappSendReactionInput,
  ) => Promise<CrmWhatsappMessage>;
  sendText: (input: CrmWhatsappSendTextInput) => Promise<CrmWhatsappMessage>;
  startConversation: (
    input: CrmWhatsappStartConversationInput,
  ) => Promise<CrmWhatsappStartConversationResult>;
  subscribeEvents: (input: {
    connectionId?: CrmWhatsappConnectionId | null;
    onError?: (error: Error) => void;
    onEvent: (event: CrmWhatsappRealtimeEvent) => void;
  }) => () => void;
} & CrmWhatsappExtrasApi;

export type CrmWhatsappExtrasApi = {
  addSessionTag: (
    sessionId: CrmWhatsappSessionId,
    input: CrmWhatsappAddSessionTagInput,
  ) => Promise<CrmWhatsappSession | null>;
  createQuickMessage: (
    input: CrmWhatsappCreateQuickMessageInput,
  ) => Promise<CrmWhatsappQuickMessage>;
  deleteQuickMessage: (
    quickMessageId: string,
  ) => Promise<CrmWhatsappQuickMessage | null>;
  listQuickMessages: () => Promise<CrmWhatsappQuickMessage[]>;
  listTags: (input?: CrmWhatsappListTagsInput) => Promise<CrmWhatsappTag[]>;
  listCatalogProducts: (
    input: CrmWhatsappListCatalogProductsInput,
  ) => Promise<CrmWhatsappCatalogProductsPage>;
  listFailedProviderEvents: () => Promise<CrmWhatsappProviderEventsResponse>;
  removeSessionTag: (
    sessionId: CrmWhatsappSessionId,
    tagId: string,
  ) => Promise<CrmWhatsappSession | null>;
  sendCatalog: (
    input: CrmWhatsappSendCatalogInput,
  ) => Promise<CrmWhatsappMessage>;
  sendCatalogProduct: (
    input: CrmWhatsappSendCatalogProductInput,
  ) => Promise<CrmWhatsappMessage>;
  sendLocation: (
    input: CrmWhatsappSendLocationInput,
  ) => Promise<CrmWhatsappMessage>;
  sendQuickMessage: (
    input: CrmWhatsappSendQuickMessageInput,
  ) => Promise<CrmWhatsappMessage>;
  sendVehicle: (
    input: CrmWhatsappSendVehicleInput,
  ) => Promise<CrmWhatsappMessage>;
  updateQuickMessage: (
    quickMessageId: string,
    input: CrmWhatsappUpdateQuickMessageInput,
  ) => Promise<CrmWhatsappQuickMessage>;
  retryProviderEvent: (
    eventId: string,
  ) => Promise<CrmWhatsappRetryProviderEventResponse>;
};

export type CreateCrmWhatsappApiOptions = {
  auth?: ProductCrmAuth;
  baseUrl?: string;
  fetch: typeof fetch;
};

type JsonBody = Record<string, unknown>;

export function createCrmWhatsappApi({
  auth = {},
  baseUrl,
  fetch,
}: CreateCrmWhatsappApiOptions): CrmWhatsappApi {
  const getJson = <T>(route: string) =>
    fetch(route, {
      headers: createProductCrmHeaders(auth),
      method: "GET",
    }).then(readJson<T>);
  const postJson = <T>(route: string, body: JsonBody = {}) =>
    fetch(route, {
      body: JSON.stringify(cleanJson(body)),
      headers: createProductCrmHeaders(auth),
      method: "POST",
    }).then(readJson<T>);
  const patchJson = <T>(route: string, body: JsonBody = {}) =>
    fetch(route, {
      body: JSON.stringify(cleanJson(body)),
      headers: createProductCrmHeaders(auth),
      method: "PATCH",
    }).then(readJson<T>);
  const postMaybeJson = <T>(route: string, body: JsonBody = {}) =>
    fetch(route, {
      body: JSON.stringify(cleanJson(body)),
      headers: createProductCrmHeaders(auth),
      method: "POST",
    }).then(readMaybeJson<T>);
  const deleteMaybeJson = <T>(route: string) =>
    fetch(route, {
      headers: createProductCrmHeaders(auth),
      method: "DELETE",
    }).then(readMaybeJson<T>);

  return {
    addSessionTag: (sessionId, input) =>
      postMaybeJson(crmWhatsappRoutes.sessionTags(sessionId, baseUrl), input),
    assignSession: (sessionId, input) =>
      postMaybeJson(crmWhatsappRoutes.assignSession(sessionId, baseUrl), {
        assignedUserId: input.assignedUserId,
      }),
    closeSession: (sessionId) =>
      postMaybeJson(crmWhatsappRoutes.closeSession(sessionId, baseUrl)),
    createQuickMessage: (input) =>
      postJson(crmWhatsappRoutes.quickMessages(baseUrl), input),
    deleteQuickMessage: (quickMessageId) =>
      deleteMaybeJson(crmWhatsappRoutes.quickMessage(quickMessageId, baseUrl)),
    deleteMessage: (messageId) =>
      deleteMaybeJson(crmWhatsappRoutes.message(messageId, baseUrl)),
    interveneSession: (sessionId, input) =>
      postMaybeJson(
        crmWhatsappRoutes.interveneSession(sessionId, baseUrl),
        input,
      ),
    listConnections: () => getJson(crmWhatsappRoutes.connections(baseUrl)),
    listMessages: (sessionId, query) =>
      getJson(
        withQuery(crmWhatsappRoutes.messages(sessionId, baseUrl), [
          createCrmWhatsappMessageQuery(query),
        ]),
      ),
    listQuickMessages: () => getJson(crmWhatsappRoutes.quickMessages(baseUrl)),
    listTags: (input) =>
      getJson(
        withQuery(crmWhatsappRoutes.tags(baseUrl), [
          createCrmWhatsappTagsQuery(input),
        ]),
      ),
    listCatalogProducts: (input) =>
      getJson(
        withQuery(crmWhatsappRoutes.catalogProducts(baseUrl), [
          createCrmWhatsappCatalogProductsQuery(input),
        ]),
      ),
    listFailedProviderEvents: () =>
      getJson(crmWhatsappRoutes.failedProviderEvents(baseUrl)),
    markSessionRead: (sessionId) =>
      postMaybeJson(crmWhatsappRoutes.markSessionRead(sessionId, baseUrl)),
    markSessionUnread: (sessionId) =>
      postMaybeJson(crmWhatsappRoutes.markSessionUnread(sessionId, baseUrl)),
    listSessions: (query) =>
      getJson(
        withQuery(crmWhatsappRoutes.sessions(baseUrl), [
          createCrmWhatsappSessionQuery(query),
        ]),
      ),
    listSessionCounts: (query) =>
      getJson(
        withQuery(crmWhatsappRoutes.sessionCounts(baseUrl), [
          createCrmWhatsappSessionCountsQuery(query),
        ]),
      ),
    removeSessionTag: (sessionId, tagId) =>
      deleteMaybeJson(crmWhatsappRoutes.sessionTag(sessionId, tagId, baseUrl)),
    removeReaction: (messageId) =>
      deleteMaybeJson(crmWhatsappRoutes.messageReaction(messageId, baseUrl)),
    retryProviderEvent: (eventId) =>
      postJson(crmWhatsappRoutes.retryProviderEvent(eventId, baseUrl)),
    sendCatalog: (input) =>
      postJson(crmWhatsappRoutes.sendCatalog(baseUrl), input),
    sendCatalogProduct: (input) =>
      postJson(crmWhatsappRoutes.sendCatalogProduct(baseUrl), input),
    sendLocation: (input) =>
      postJson(crmWhatsappRoutes.sendLocation(baseUrl), input),
    sendMedia: (input) => postJson(crmWhatsappRoutes.sendMedia(baseUrl), input),
    sendReaction: (messageId, input) =>
      postJson(crmWhatsappRoutes.messageReaction(messageId, baseUrl), input),
    sendQuickMessage: (input) =>
      postJson(
        crmWhatsappRoutes.sendQuickMessage(input.quickMessageId, baseUrl),
        { sessionId: input.sessionId },
      ),
    sendText: (input) => postJson(crmWhatsappRoutes.sendText(baseUrl), input),
    sendVehicle: (input) =>
      postJson(crmWhatsappRoutes.sendVehicle(baseUrl), input),
    startConversation: (input) =>
      postJson(crmWhatsappRoutes.conversationsStart(baseUrl), input),
    subscribeEvents: (input) =>
      subscribeCrmWhatsappEvents({
        connectionId: input.connectionId,
        eventsRoute: crmWhatsappRoutes.events(baseUrl),
        eventsTicketRoute: crmWhatsappRoutes.eventsTicket(baseUrl),
        onError: input.onError,
        onEvent: input.onEvent,
        postJson,
      }),
    updateQuickMessage: (quickMessageId, input) =>
      patchJson(crmWhatsappRoutes.quickMessage(quickMessageId, baseUrl), input),
  };
}

async function readJson<T>(response: Response): Promise<T> {
  return readApiJson<T>(response, { feature: "CRM WhatsApp" });
}

async function readMaybeJson<T>(response: Response): Promise<T | null> {
  if (!response.ok) return readJson<T>(response);
  if (response.status === 204) return null;
  const text = await response.text();
  if (!text.trim()) return null;
  return JSON.parse(text) as T;
}

function cleanJson(body: JsonBody) {
  return Object.fromEntries(
    Object.entries(body).filter(([, value]) => value !== undefined),
  );
}
