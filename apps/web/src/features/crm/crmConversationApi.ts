import {
  crmConnectionOverviewSchema,
  crmConversationCycleCountsResponseSchema,
  crmConversationCycleListResponseSchema,
  crmExternalBotActionAcceptedResultSchema,
  crmExternalBotConfigurationReadSchema,
  crmExternalBotTestResultSchema,
  crmMessageListResponseSchema,
  crmRoutingPolicyReadSchema,
} from "@lojaveiculosv2/shared";
import { readApiJson } from "../../lib/apiErrors";
import { createProductCrmHeaders } from "./productCrmApi";
import type {
  CreateCrmConversationApiOptions,
  CrmConversationApi,
} from "./crmConversationApiTypes";
import {
  createCrmWhatsappCatalogProductsQuery,
  createCrmStatisticsQuery,
  createCrmMessageQuery,
  createCrmScheduledMessagesQuery,
  createCrmConversationCycleCountsQuery,
  createCrmConversationCyclesQuery,
  createCrmTagsQuery,
  crmConversationRoutes,
  withQuery,
} from "./crmConversationApiRoutes";
import {
  createCrmCampaignsQuery,
  crmCampaignRoutes,
} from "./crmCampaignApiRoutes";
import { subscribeCrmEvents } from "./crmRealtimeApi";
import type { CrmStatisticsResponse } from "./crmStatisticsTypes";

export {
  createCrmConversationCyclesQuery,
  crmConversationRoutes,
} from "./crmConversationApiRoutes";
export type {
  CreateCrmConversationApiOptions,
  CrmOlxChatSetupRetryResult,
  CrmConversationApi,
  CrmConversationExtrasApi,
} from "./crmConversationApiTypes";

type JsonBody = Record<string, unknown>;

export function createCrmConversationApi({
  auth = {},
  baseUrl,
  fetch,
}: CreateCrmConversationApiOptions): CrmConversationApi {
  const getJson = <T>(route: string, options?: { signal?: AbortSignal }) =>
    fetch(route, {
      headers: createProductCrmHeaders(auth),
      method: "GET",
      ...(options?.signal ? { signal: options.signal } : {}),
    }).then(readJson<T>);
  const postJson = <T>(
    route: string,
    body: JsonBody = {},
    extraHeaders: Record<string, string> = {},
  ) =>
    fetch(route, {
      body: JSON.stringify(cleanJson(body)),
      headers: { ...createProductCrmHeaders(auth), ...extraHeaders },
      method: "POST",
    }).then(readJson<T>);
  const patchJson = <T>(route: string, body: JsonBody = {}) =>
    fetch(route, {
      body: JSON.stringify(cleanJson(body)),
      headers: createProductCrmHeaders(auth),
      method: "PATCH",
    }).then(readJson<T>);
  const putJson = <T>(route: string, body: JsonBody) =>
    fetch(route, {
      body: JSON.stringify(cleanJson(body)),
      headers: createProductCrmHeaders(auth),
      method: "PUT",
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
    getStatistics: (input, options) =>
      fetch(
        withQuery(crmConversationRoutes.statistics(baseUrl), [
          createCrmStatisticsQuery(input),
        ]),
        {
          headers: createProductCrmHeaders(auth),
          method: "GET",
          ...(options?.signal ? { signal: options.signal } : {}),
        },
      ).then(readJson<CrmStatisticsResponse>),
    addCycleTag: (cycleId, input) =>
      postMaybeJson(crmConversationRoutes.cycleTags(cycleId, baseUrl), input),
    assignCycle: (cycleId, input) =>
      postJson(crmConversationRoutes.assignCycle(cycleId, baseUrl), input),
    authorizeComposioConnection: (connectionId) =>
      postJson(crmConversationRoutes.composioAuthorize(connectionId, baseUrl)),
    cancelScheduledMessage: (scheduledMessageId) =>
      deleteMaybeJson(
        crmConversationRoutes.scheduledMessage(scheduledMessageId, baseUrl),
      ),
    closeCycle: (cycleId, input) =>
      postJson(crmConversationRoutes.closeCycle(cycleId, baseUrl), input),
    concludeCycle: (cycleId, input) =>
      postJson(crmConversationRoutes.concludeCycle(cycleId, baseUrl), input),
    completeComposioConnection: (connectionId) =>
      postJson(crmConversationRoutes.composioComplete(connectionId, baseUrl)),
    cancelCampaign: (campaignId) =>
      postJson(crmCampaignRoutes.campaignAction(campaignId, "cancel", baseUrl)),
    createQuickMessage: (input) =>
      postJson(crmConversationRoutes.quickMessages(baseUrl), input),
    createCampaign: (input) =>
      postJson(crmCampaignRoutes.campaigns(baseUrl), input),
    createConnection: (input) =>
      postJson(crmConversationRoutes.connections(baseUrl), input),
    disconnectZapiConnection: (connectionId) =>
      postJson(crmConversationRoutes.zapiDisconnect(connectionId, baseUrl)),
    repairZapiConnectionCredentials: (connectionId, input) =>
      putJson(
        crmConversationRoutes.zapiCredentials(connectionId, baseUrl),
        input,
      ),
    replaceZapiConnection: (connectionId, input) =>
      postJson(
        crmConversationRoutes.zapiReplacement(connectionId, baseUrl),
        input,
      ),
    getZapiReplacementStatus: (connectionId, operationId) =>
      getJson(
        crmConversationRoutes.zapiReplacementStatus(
          connectionId,
          operationId,
          baseUrl,
        ),
      ),
    configureZapiWebhooks: (connectionId) =>
      postJson(
        crmConversationRoutes.zapiWebhooksConfigure(connectionId, baseUrl),
      ),
    createScheduledMessage: (input) =>
      postJson(crmConversationRoutes.scheduledMessages(baseUrl), input),
    createTag: (input) => postJson(crmConversationRoutes.tags(baseUrl), input),
    deleteMessage: (messageId) =>
      deleteMaybeJson(crmConversationRoutes.message(messageId, baseUrl)),
    deleteQuickMessage: (quickMessageId) =>
      deleteMaybeJson(
        crmConversationRoutes.quickMessage(quickMessageId, baseUrl),
      ),
    deleteTag: (tagId) =>
      deleteMaybeJson(crmConversationRoutes.tag(tagId, baseUrl)),
    updateCycleAttendance: (cycleId, input) =>
      postJson(
        crmConversationRoutes.updateCycleAttendance(cycleId, baseUrl),
        input,
      ),
    getBotIntegration: () =>
      getJson<unknown>(crmConversationRoutes.botIntegration(baseUrl)).then(
        (payload) => crmExternalBotConfigurationReadSchema.parse(payload),
      ),
    getRoutingPolicy: () =>
      getJson<unknown>(crmConversationRoutes.routingPolicy(baseUrl)).then(
        (payload) => crmRoutingPolicyReadSchema.parse(payload),
      ),
    getCampaign: (campaignId) =>
      getJson(crmCampaignRoutes.campaignDetail(campaignId, baseUrl)),
    listCatalogProducts: (input) =>
      getJson(
        withQuery(crmConversationRoutes.catalogProducts(baseUrl), [
          createCrmWhatsappCatalogProductsQuery(input),
        ]),
      ),
    listCampaigns: (input) =>
      getJson(
        withQuery(crmCampaignRoutes.campaigns(baseUrl), [
          createCrmCampaignsQuery(input),
        ]),
      ),
    listConnections: () =>
      getJson<unknown>(crmConversationRoutes.connections(baseUrl)).then(
        (payload) => crmConnectionOverviewSchema.parse(payload),
      ),
    listProviderEventIssues: () =>
      getJson(crmConversationRoutes.providerEventIssues(baseUrl)),
    listMessages: (cycleId, query, options) =>
      getJson<unknown>(
        withQuery(crmConversationRoutes.messages(cycleId, baseUrl), [
          createCrmMessageQuery(query),
        ]),
        options,
      ).then((payload) => crmMessageListResponseSchema.parse(payload)),
    listQuickMessages: () =>
      getJson(crmConversationRoutes.quickMessages(baseUrl)),
    listScheduledMessages: (input) =>
      getJson(
        withQuery(crmConversationRoutes.scheduledMessages(baseUrl), [
          createCrmScheduledMessagesQuery(input),
        ]),
      ),
    listConversationCycleCounts: (query) =>
      getJson<unknown>(
        withQuery(crmConversationRoutes.conversationCycleCounts(baseUrl), [
          createCrmConversationCycleCountsQuery(query),
        ]),
      ).then((payload) =>
        crmConversationCycleCountsResponseSchema.parse(payload),
      ),
    listConversationCycles: (query) =>
      getJson<unknown>(
        withQuery(crmConversationRoutes.conversationCycles(baseUrl), [
          createCrmConversationCyclesQuery(query),
        ]),
      ).then((payload) =>
        crmConversationCycleListResponseSchema.parse(payload),
      ),
    listTags: (input) =>
      getJson(
        withQuery(crmConversationRoutes.tags(baseUrl), [
          createCrmTagsQuery(input),
        ]),
      ),
    markCycleRead: (cycleId, input) =>
      postJson(crmConversationRoutes.markCycleRead(cycleId, baseUrl), input),
    markCycleUnread: (cycleId, input) =>
      postJson(crmConversationRoutes.markCycleUnread(cycleId, baseUrl), input),
    processDueScheduledMessages: (input = {}) =>
      postJson(
        crmConversationRoutes.scheduledMessagesProcessDue(baseUrl),
        input,
      ),
    updateScheduledMessage: (scheduledMessageId, input) =>
      patchJson(
        crmConversationRoutes.scheduledMessage(scheduledMessageId, baseUrl),
        input,
      ),
    pauseCampaign: (campaignId) =>
      postJson(crmCampaignRoutes.campaignAction(campaignId, "pause", baseUrl)),
    removeReaction: (messageId) =>
      deleteMaybeJson(
        crmConversationRoutes.messageReaction(messageId, baseUrl),
      ),
    requestZapiPairingCode: (connectionId, phone) =>
      postJson(crmConversationRoutes.zapiPairingCode(connectionId, baseUrl), {
        phone,
      }),
    requestZapiPairingQr: (connectionId) =>
      postJson(crmConversationRoutes.zapiPairingQr(connectionId, baseUrl)),
    refreshZapiConnectionStatus: (connectionId) =>
      postJson(crmConversationRoutes.zapiStatusRefresh(connectionId, baseUrl)),
    retryOlxChatSetup: (connectionId) =>
      postJson(crmConversationRoutes.olxChatSetupRetry(connectionId, baseUrl)),
    setConnectionPaused: (connectionId, paused) =>
      patchJson(crmConversationRoutes.connection(connectionId, baseUrl), {
        status: paused ? "paused" : "active",
      }),
    removeCycleTag: (cycleId, tagId) =>
      deleteMaybeJson(crmConversationRoutes.cycleTag(cycleId, tagId, baseUrl)),
    reorderTags: (input) =>
      patchJson(crmConversationRoutes.tagsReorder(baseUrl), input),
    retryProviderEvent: (eventId) =>
      postJson(crmConversationRoutes.retryProviderEvent(eventId, baseUrl)),
    resumeCampaign: (campaignId) =>
      postJson(crmCampaignRoutes.campaignAction(campaignId, "resume", baseUrl)),
    sendCatalog: ({ idempotencyKey, ...input }) =>
      postJson(
        crmConversationRoutes.sendCatalog(baseUrl),
        input,
        idempotencyHeaders(idempotencyKey),
      ),
    sendCatalogProduct: ({ idempotencyKey, ...input }) =>
      postJson(
        crmConversationRoutes.sendCatalogProduct(baseUrl),
        input,
        idempotencyHeaders(idempotencyKey),
      ),
    sendLocation: ({ idempotencyKey, ...input }) =>
      postJson(
        crmConversationRoutes.sendLocation(baseUrl),
        input,
        idempotencyHeaders(idempotencyKey),
      ),
    sendMedia: ({ idempotencyKey, cycleId, ...input }) =>
      postJson(
        crmConversationRoutes.sendMedia(cycleId, baseUrl),
        input,
        idempotencyKey ? { "Idempotency-Key": idempotencyKey } : {},
      ),
    sendQuickMessage: ({ idempotencyKey, ...input }) =>
      postJson(
        crmConversationRoutes.sendQuickMessage(input.quickMessageId, baseUrl),
        { cycleId: input.cycleId },
        idempotencyHeaders(idempotencyKey),
      ),
    sendReaction: (messageId, input) =>
      postJson(
        crmConversationRoutes.messageReaction(messageId, baseUrl),
        input,
      ),
    selectComposioSender: (connectionId, senderId) =>
      postJson(crmConversationRoutes.composioSender(connectionId, baseUrl), {
        senderId,
      }),
    sendText: ({ idempotencyKey, cycleId, text, ...input }) =>
      postJson(
        crmConversationRoutes.sendText(cycleId, baseUrl),
        { content: text, ...input },
        idempotencyKey ? { "Idempotency-Key": idempotencyKey } : {},
      ),
    sendVehicle: ({ idempotencyKey, ...input }) =>
      postJson(
        crmConversationRoutes.sendVehicle(baseUrl),
        input,
        idempotencyHeaders(idempotencyKey),
      ),
    startConversation: (input) =>
      postJson(crmConversationRoutes.conversationsStart(baseUrl), input),
    subscribeEvents: (input) =>
      subscribeCrmEvents({
        connectionId: input.connectionId,
        eventsRoute: crmConversationRoutes.events(baseUrl),
        eventsTicketRoute: crmConversationRoutes.eventsTicket(baseUrl),
        fetch,
        headers: createProductCrmHeaders(auth),
        onError: input.onError,
        onEvent: input.onEvent,
        ...(input.onStatus ? { onStatus: input.onStatus } : {}),
        postJson,
      }),
    updateBotIntegration: (input) =>
      patchJson<unknown>(
        crmConversationRoutes.botIntegration(baseUrl),
        input,
      ).then((payload) => crmExternalBotConfigurationReadSchema.parse(payload)),
    updateRoutingPolicy: (input) =>
      patchJson<unknown>(
        crmConversationRoutes.routingPolicy(baseUrl),
        input,
      ).then((payload) => crmRoutingPolicyReadSchema.parse(payload)),
    updateQuickMessage: (quickMessageId, input) =>
      patchJson(
        crmConversationRoutes.quickMessage(quickMessageId, baseUrl),
        input,
      ),
    updateTag: (tagId, input) =>
      patchJson(crmConversationRoutes.tag(tagId, baseUrl), input),
  };
}

export function parseCrmExternalBotTestResult(payload: unknown) {
  return crmExternalBotTestResultSchema.parse(payload);
}

export function parseCrmExternalBotActionAcceptedResult(payload: unknown) {
  return crmExternalBotActionAcceptedResultSchema.parse(payload);
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

function idempotencyHeaders(idempotencyKey?: string) {
  return idempotencyKey ? { "Idempotency-Key": idempotencyKey } : {};
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function readNonNegativeNumber(value: unknown, fallback: number) {
  return typeof value === "number" && Number.isFinite(value) && value >= 0
    ? value
    : fallback;
}
