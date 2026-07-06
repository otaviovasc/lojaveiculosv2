import { readApiJson } from "../../lib/apiErrors";
import { createProductCrmHeaders } from "./productCrmApi";
import type {
  CreateCrmWhatsappApiOptions,
  CrmWhatsappApi,
} from "./crmWhatsappApiTypes";
import {
  createCrmWhatsappCatalogProductsQuery,
  createCrmWhatsappMessageQuery,
  createCrmWhatsappScheduledMessagesQuery,
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
export type {
  CreateCrmWhatsappApiOptions,
  CrmWhatsappApi,
  CrmWhatsappExtrasApi,
} from "./crmWhatsappApiTypes";

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
    cancelScheduledMessage: (scheduledMessageId) =>
      deleteMaybeJson(
        crmWhatsappRoutes.scheduledMessage(scheduledMessageId, baseUrl),
      ),
    closeSession: (sessionId) =>
      postMaybeJson(crmWhatsappRoutes.closeSession(sessionId, baseUrl)),
    createQuickMessage: (input) =>
      postJson(crmWhatsappRoutes.quickMessages(baseUrl), input),
    createScheduledMessage: (input) =>
      postJson(crmWhatsappRoutes.scheduledMessages(baseUrl), input),
    createTag: (input) => postJson(crmWhatsappRoutes.tags(baseUrl), input),
    deleteMessage: (messageId) =>
      deleteMaybeJson(crmWhatsappRoutes.message(messageId, baseUrl)),
    deleteQuickMessage: (quickMessageId) =>
      deleteMaybeJson(crmWhatsappRoutes.quickMessage(quickMessageId, baseUrl)),
    deleteTag: (tagId) =>
      deleteMaybeJson(crmWhatsappRoutes.tag(tagId, baseUrl)),
    interveneSession: (sessionId, input) =>
      postMaybeJson(
        crmWhatsappRoutes.interveneSession(sessionId, baseUrl),
        input,
      ),
    getBotIntegration: () => getJson(crmWhatsappRoutes.botIntegration(baseUrl)),
    listCatalogProducts: (input) =>
      getJson(
        withQuery(crmWhatsappRoutes.catalogProducts(baseUrl), [
          createCrmWhatsappCatalogProductsQuery(input),
        ]),
      ),
    listConnections: () => getJson(crmWhatsappRoutes.connections(baseUrl)),
    listProviderEventIssues: () =>
      getJson(crmWhatsappRoutes.providerEventIssues(baseUrl)),
    listMessages: (sessionId, query) =>
      getJson(
        withQuery(crmWhatsappRoutes.messages(sessionId, baseUrl), [
          createCrmWhatsappMessageQuery(query),
        ]),
      ),
    listQuickMessages: () => getJson(crmWhatsappRoutes.quickMessages(baseUrl)),
    listScheduledMessages: (input) =>
      getJson(
        withQuery(crmWhatsappRoutes.scheduledMessages(baseUrl), [
          createCrmWhatsappScheduledMessagesQuery(input),
        ]),
      ),
    listSessionCounts: (query) =>
      getJson(
        withQuery(crmWhatsappRoutes.sessionCounts(baseUrl), [
          createCrmWhatsappSessionCountsQuery(query),
        ]),
      ),
    listSessions: (query) =>
      getJson(
        withQuery(crmWhatsappRoutes.sessions(baseUrl), [
          createCrmWhatsappSessionQuery(query),
        ]),
      ),
    listTags: (input) =>
      getJson(
        withQuery(crmWhatsappRoutes.tags(baseUrl), [
          createCrmWhatsappTagsQuery(input),
        ]),
      ),
    markSessionRead: (sessionId) =>
      postMaybeJson(crmWhatsappRoutes.markSessionRead(sessionId, baseUrl)),
    markSessionUnread: (sessionId) =>
      postMaybeJson(crmWhatsappRoutes.markSessionUnread(sessionId, baseUrl)),
    processDueScheduledMessages: (input = {}) =>
      postJson(crmWhatsappRoutes.scheduledMessagesProcessDue(baseUrl), input),
    removeReaction: (messageId) =>
      deleteMaybeJson(crmWhatsappRoutes.messageReaction(messageId, baseUrl)),
    removeSessionTag: (sessionId, tagId) =>
      deleteMaybeJson(crmWhatsappRoutes.sessionTag(sessionId, tagId, baseUrl)),
    reorderTags: (input) =>
      patchJson(crmWhatsappRoutes.tagsReorder(baseUrl), input),
    retryProviderEvent: (eventId) =>
      postJson(crmWhatsappRoutes.retryProviderEvent(eventId, baseUrl)),
    sendCatalog: (input) =>
      postJson(crmWhatsappRoutes.sendCatalog(baseUrl), input),
    sendCatalogProduct: (input) =>
      postJson(crmWhatsappRoutes.sendCatalogProduct(baseUrl), input),
    sendLocation: (input) =>
      postJson(crmWhatsappRoutes.sendLocation(baseUrl), input),
    sendMedia: (input) => postJson(crmWhatsappRoutes.sendMedia(baseUrl), input),
    sendQuickMessage: (input) =>
      postJson(
        crmWhatsappRoutes.sendQuickMessage(input.quickMessageId, baseUrl),
        { sessionId: input.sessionId },
      ),
    sendReaction: (messageId, input) =>
      postJson(crmWhatsappRoutes.messageReaction(messageId, baseUrl), input),
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
    updateConnection: (connectionId, input) =>
      patchJson(crmWhatsappRoutes.connection(connectionId, baseUrl), input),
    updateBotIntegration: (input) =>
      patchJson(crmWhatsappRoutes.botIntegration(baseUrl), input),
    updateQuickMessage: (quickMessageId, input) =>
      patchJson(crmWhatsappRoutes.quickMessage(quickMessageId, baseUrl), input),
    updateTag: (tagId, input) =>
      patchJson(crmWhatsappRoutes.tag(tagId, baseUrl), input),
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
