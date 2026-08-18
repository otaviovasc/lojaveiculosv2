import {
  crmChannelConnectionSchema,
  type CrmConnectionCapability,
} from "@lojaveiculosv2/shared";
import { AppApiError, readApiJson } from "../../lib/apiErrors";
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
import {
  createCrmWhatsappCampaignsQuery,
  crmWhatsappCampaignRoutes,
} from "./crmWhatsappCampaignApiRoutes";
import { subscribeCrmWhatsappEvents } from "./crmWhatsappRealtimeApi";
import {
  parseCrmWhatsappMessages,
  parseCrmWhatsappSessions,
} from "./crmWhatsappModel";
import type {
  CrmCanonicalConnectionsResponse,
  CrmCanonicalProviderConnection,
  CrmWhatsappProviderCapabilities,
  CrmWhatsappSetupProvider,
  CrmWhatsappZapiAddonContract,
} from "./crmWhatsappTypes";
import { normalizeCrmRoutingPolicy } from "./crmRoutingTypes";
import type { CrmWhatsappBotIntegrationResponse } from "./crmWhatsappIntegrationTypes";

export {
  createCrmWhatsappSessionQuery,
  crmWhatsappRoutes,
} from "./crmWhatsappApiRoutes";
export type {
  CreateCrmWhatsappApiOptions,
  CrmOlxChatSetupRetryResult,
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
      postJson(crmWhatsappRoutes.assignSession(sessionId, baseUrl), input),
    authorizeComposioConnection: (connectionId) =>
      postJson(crmWhatsappRoutes.composioAuthorize(connectionId, baseUrl)),
    cancelScheduledMessage: (scheduledMessageId) =>
      deleteMaybeJson(
        crmWhatsappRoutes.scheduledMessage(scheduledMessageId, baseUrl),
      ),
    closeSession: (sessionId, input) =>
      postJson(crmWhatsappRoutes.closeSession(sessionId, baseUrl), input),
    concludeSession: (sessionId, input) =>
      postJson(crmWhatsappRoutes.concludeSession(sessionId, baseUrl), input),
    completeComposioConnection: (connectionId) =>
      postJson(crmWhatsappRoutes.composioComplete(connectionId, baseUrl)),
    cancelCampaign: (campaignId) =>
      postJson(
        crmWhatsappCampaignRoutes.campaignAction(campaignId, "cancel", baseUrl),
      ),
    createQuickMessage: (input) =>
      postJson(crmWhatsappRoutes.quickMessages(baseUrl), input),
    createCampaign: (input) =>
      postJson(crmWhatsappCampaignRoutes.campaigns(baseUrl), input),
    createConnection: (input) =>
      postJson(crmWhatsappRoutes.connections(baseUrl), input),
    disconnectZapiConnection: (connectionId) =>
      postJson(crmWhatsappRoutes.zapiDisconnect(connectionId, baseUrl)),
    configureZapiWebhooks: (connectionId) =>
      postJson(crmWhatsappRoutes.zapiWebhooksConfigure(connectionId, baseUrl)),
    getZapiAddonContract: () =>
      getJson<unknown>(crmWhatsappRoutes.billingOverview(baseUrl)).then(
        readZapiAddonContract,
      ),
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
      postJson(crmWhatsappRoutes.interveneSession(sessionId, baseUrl), input),
    getBotIntegration: () =>
      getJson<{
        configuration: CrmWhatsappBotIntegrationResponse["integration"];
      }>(crmWhatsappRoutes.botIntegration(baseUrl)).then((response) => ({
        integration: response.configuration,
      })),
    getRoutingPolicy: () =>
      getJson<unknown>(crmWhatsappRoutes.routingPolicy(baseUrl)).then(
        normalizeCrmRoutingPolicy,
      ),
    getCampaign: (campaignId) =>
      getJson(crmWhatsappCampaignRoutes.campaignDetail(campaignId, baseUrl)),
    listCatalogProducts: (input) =>
      getJson(
        withQuery(crmWhatsappRoutes.catalogProducts(baseUrl), [
          createCrmWhatsappCatalogProductsQuery(input),
        ]),
      ),
    listCampaigns: (input) =>
      getJson(
        withQuery(crmWhatsappCampaignRoutes.campaigns(baseUrl), [
          createCrmWhatsappCampaignsQuery(input),
        ]),
      ),
    listConnections: () =>
      getJson<unknown>(crmWhatsappRoutes.connections(baseUrl)).then(
        normalizeConnectionsResponse,
      ),
    listProviderEventIssues: () =>
      getJson(crmWhatsappRoutes.providerEventIssues(baseUrl)),
    listMessages: (sessionId, query) =>
      getJson(
        withQuery(crmWhatsappRoutes.messages(sessionId, baseUrl), [
          createCrmWhatsappMessageQuery(query),
        ]),
      ).then(parseCrmWhatsappMessages),
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
      ).then(parseCrmWhatsappSessions),
    listTags: (input) =>
      getJson(
        withQuery(crmWhatsappRoutes.tags(baseUrl), [
          createCrmWhatsappTagsQuery(input),
        ]),
      ),
    markSessionRead: (sessionId, input) =>
      postJson(crmWhatsappRoutes.markSessionRead(sessionId, baseUrl), input),
    markSessionUnread: (sessionId, input) =>
      postJson(crmWhatsappRoutes.markSessionUnread(sessionId, baseUrl), input),
    processDueScheduledMessages: (input = {}) =>
      postJson(crmWhatsappRoutes.scheduledMessagesProcessDue(baseUrl), input),
    pauseCampaign: (campaignId) =>
      postJson(
        crmWhatsappCampaignRoutes.campaignAction(campaignId, "pause", baseUrl),
      ),
    removeReaction: (messageId) =>
      deleteMaybeJson(crmWhatsappRoutes.messageReaction(messageId, baseUrl)),
    requestZapiPairingCode: (connectionId, phone) =>
      postJson(crmWhatsappRoutes.zapiPairingCode(connectionId, baseUrl), {
        phone,
      }),
    requestZapiPairingQr: (connectionId) =>
      postJson(crmWhatsappRoutes.zapiPairingQr(connectionId, baseUrl)),
    refreshZapiConnectionStatus: (connectionId) =>
      postJson(crmWhatsappRoutes.zapiStatusRefresh(connectionId, baseUrl)),
    retryOlxChatSetup: (connectionId) =>
      postJson(crmWhatsappRoutes.olxChatSetupRetry(connectionId, baseUrl)),
    requestZapiAddon: () =>
      postJson<{ contract: CrmWhatsappZapiAddonContract }>(
        crmWhatsappRoutes.billingZapiRequest(baseUrl),
      ).then((response) => response.contract),
    setConnectionPaused: (connectionId, paused) =>
      patchJson(crmWhatsappRoutes.connection(connectionId, baseUrl), {
        status: paused ? "paused" : "active",
      }),
    removeSessionTag: (sessionId, tagId) =>
      deleteMaybeJson(crmWhatsappRoutes.sessionTag(sessionId, tagId, baseUrl)),
    reorderTags: (input) =>
      patchJson(crmWhatsappRoutes.tagsReorder(baseUrl), input),
    retryProviderEvent: (eventId) =>
      postJson(crmWhatsappRoutes.retryProviderEvent(eventId, baseUrl)),
    resumeCampaign: (campaignId) =>
      postJson(
        crmWhatsappCampaignRoutes.campaignAction(campaignId, "resume", baseUrl),
      ),
    sendCatalog: ({ idempotencyKey, ...input }) =>
      postJson(
        crmWhatsappRoutes.sendCatalog(baseUrl),
        input,
        idempotencyHeaders(idempotencyKey),
      ),
    sendCatalogProduct: ({ idempotencyKey, ...input }) =>
      postJson(
        crmWhatsappRoutes.sendCatalogProduct(baseUrl),
        input,
        idempotencyHeaders(idempotencyKey),
      ),
    sendLocation: ({ idempotencyKey, ...input }) =>
      postJson(
        crmWhatsappRoutes.sendLocation(baseUrl),
        input,
        idempotencyHeaders(idempotencyKey),
      ),
    sendMedia: ({ idempotencyKey, ...input }) =>
      postJson(
        crmWhatsappRoutes.sendMedia(baseUrl),
        input,
        idempotencyKey ? { "Idempotency-Key": idempotencyKey } : {},
      ),
    sendQuickMessage: ({ idempotencyKey, ...input }) =>
      postJson(
        crmWhatsappRoutes.sendQuickMessage(input.quickMessageId, baseUrl),
        { sessionId: input.sessionId },
        idempotencyHeaders(idempotencyKey),
      ),
    sendReaction: (messageId, input) =>
      postJson(crmWhatsappRoutes.messageReaction(messageId, baseUrl), input),
    selectComposioSender: (connectionId, senderId) =>
      postJson(crmWhatsappRoutes.composioSender(connectionId, baseUrl), {
        senderId,
      }),
    sendText: ({ idempotencyKey, ...input }) =>
      postJson(
        crmWhatsappRoutes.sendText(baseUrl),
        input,
        idempotencyKey ? { "Idempotency-Key": idempotencyKey } : {},
      ),
    sendVehicle: ({ idempotencyKey, ...input }) =>
      postJson(
        crmWhatsappRoutes.sendVehicle(baseUrl),
        input,
        idempotencyHeaders(idempotencyKey),
      ),
    startConversation: (input) =>
      postJson(crmWhatsappRoutes.conversationsStart(baseUrl), input),
    subscribeEvents: (input) =>
      subscribeCrmWhatsappEvents({
        connectionId: input.connectionId,
        eventsRoute: crmWhatsappRoutes.events(baseUrl),
        eventsTicketRoute: crmWhatsappRoutes.eventsTicket(baseUrl),
        onError: input.onError,
        onEvent: input.onEvent,
        ...(input.onStatus ? { onStatus: input.onStatus } : {}),
        postJson,
      }),
    updateBotIntegration: (input) =>
      patchJson<{
        configuration: CrmWhatsappBotIntegrationResponse["integration"];
      }>(crmWhatsappRoutes.botIntegration(baseUrl), input).then((response) => ({
        integration: response.configuration,
      })),
    updateRoutingPolicy: (input) =>
      patchJson<unknown>(crmWhatsappRoutes.routingPolicy(baseUrl), input).then(
        normalizeCrmRoutingPolicy,
      ),
    updateQuickMessage: (quickMessageId, input) =>
      patchJson(crmWhatsappRoutes.quickMessage(quickMessageId, baseUrl), input),
    updateTag: (tagId, input) =>
      patchJson(crmWhatsappRoutes.tag(tagId, baseUrl), input),
  };
}

export function normalizeConnectionsResponse(
  payload: unknown,
): CrmCanonicalConnectionsResponse {
  const record = asRecord(payload);
  if (!Array.isArray(record.connections)) {
    throwInvalidConnectionContract(null, ["connections"]);
  }
  const connections = record.connections.map((connection, index) => {
    const canonical = parseCanonicalConnection(connection, index);
    return {
      ...asRecord(connection),
      ...canonical,
      capabilities: toErgonomicCapabilities(canonical.capabilities),
    } as CrmCanonicalProviderConnection;
  });
  const allowance = asRecord(record.allowance);
  const limit = readNonNegativeNumber(allowance.limit, connections.length);
  const used = readNonNegativeNumber(allowance.used, connections.length);
  const remaining = readNonNegativeNumber(
    allowance.remaining,
    Math.max(0, limit - used),
  );
  const explicitProviders =
    Array.isArray(record.availableProviders) &&
    record.availableProviders.every(isSetupProvider)
      ? record.availableProviders
      : [];
  return {
    allowance: { limit, remaining, used },
    availableProviders: explicitProviders,
    connections,
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

function idempotencyHeaders(idempotencyKey?: string) {
  return idempotencyKey ? { "Idempotency-Key": idempotencyKey } : {};
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function isSetupProvider(value: unknown): value is CrmWhatsappSetupProvider {
  return value === "zapi" || value === "composio_whatsapp";
}

function parseCanonicalConnection(
  value: unknown,
  connectionIndex: number,
): ReturnType<typeof crmChannelConnectionSchema.parse> {
  const parsed = crmChannelConnectionSchema.safeParse(value);
  if (parsed.success) return parsed.data;
  const fields = [
    ...new Set(
      parsed.error.issues.map((issue) => String(issue.path[0] ?? "connection")),
    ),
  ];
  throwInvalidConnectionContract(connectionIndex, fields);
}

function toErgonomicCapabilities(
  canonical: readonly CrmConnectionCapability[],
): CrmWhatsappProviderCapabilities {
  const capabilities = new Set(canonical);
  const media = capabilities.has("media");
  const outbound = capabilities.has("outbound");
  const text = capabilities.has("text") || outbound;
  return {
    audio: media,
    catalog: false,
    conversationStart: capabilities.has("conversation_start"),
    delete: false,
    documents: media,
    imageCaption: media && text,
    images: media,
    location: media,
    quickMessages: text,
    reactions: false,
    reply: outbound,
    scheduling: capabilities.has("scheduling"),
    templates: capabilities.has("templates"),
    text,
    vehicle: media,
    video: media,
  };
}

function throwInvalidConnectionContract(
  connectionIndex: number | null,
  fields: readonly string[],
): never {
  throw new AppApiError({
    code: "CRM_CONNECTION_DTO_INVALID",
    details: {
      ...(connectionIndex === null ? {} : { connectionIndex }),
      fields,
    },
    message: "CRM connection response violates the canonical DTO.",
    status: 502,
    userMessage:
      "A integração retornou uma conexão CRM inválida. Atualize e tente novamente.",
  });
}

function readZapiAddonContract(
  payload: unknown,
): CrmWhatsappZapiAddonContract | null {
  const record = asRecord(payload);
  const contracts = Array.isArray(record.addonContracts)
    ? record.addonContracts.filter(isRecord)
    : [];
  return contracts.find(isZapiAddonContract) ?? null;
}

function isZapiAddonContract(
  value: Record<string, unknown>,
): value is CrmWhatsappZapiAddonContract {
  return (
    value.addonCode === "crm_zapi" &&
    typeof value.id === "string" &&
    typeof value.monthlyPriceCents === "number" &&
    isNullableString(value.cancellationScheduledFor) &&
    isNullableString(value.paidAt) &&
    isNullableString(value.scheduledFor) &&
    isNullableString(value.setupCompletedAt) &&
    isZapiAddonContractStatus(value.status) &&
    typeof value.storeId === "string" &&
    isNullableString(value.supportCode)
  );
}

function isNullableString(value: unknown): value is string | null {
  return value === null || typeof value === "string";
}

function isZapiAddonContractStatus(
  value: unknown,
): value is CrmWhatsappZapiAddonContract["status"] {
  return (
    value === "active" ||
    value === "cancelled" ||
    value === "paid_awaiting_setup" ||
    value === "pending" ||
    value === "scheduled"
  );
}

function readNonNegativeNumber(value: unknown, fallback: number) {
  return typeof value === "number" && Number.isFinite(value) && value >= 0
    ? value
    : fallback;
}
