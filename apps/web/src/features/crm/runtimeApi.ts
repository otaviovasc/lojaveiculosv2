import {
  createProductCrmApi,
  type CreateProductCrmApiOptions,
  type ProductCrmApi,
} from "./productCrmApi";
import {
  createCrmConversationApi,
  type CrmConversationApi,
} from "./crmConversationApi";
import type { ProductCrmAuth } from "./productCrmTypes";
import { readRuntimeStoreSlug } from "../account/currentStore";
import {
  createRuntimeActorAuth,
  createRuntimeFetch,
  readClerkToken,
  readRuntimeApiBaseUrl,
} from "../account/runtimeAuth";

export function createRuntimeProductCrmApi(): ProductCrmApi {
  return {
    archiveLead: async (leadId) =>
      (await createRuntimeProductApi()).archiveLead!(leadId),
    createActivity: async (leadId, input) =>
      (await createRuntimeProductApi()).createActivity(leadId, input),
    createFinancialProduct: async (leadId, input) =>
      (await createRuntimeProductApi()).createFinancialProduct(leadId, input),
    createLead: async (input) =>
      createProductCrmApi(await createProductCrmApiOptions()).createLead(input),
    createPipeline: async (input) =>
      (await createRuntimeProductApi()).createPipeline(input),
    deletePipeline: async (pipelineId) =>
      (await createRuntimeProductApi()).deletePipeline(pipelineId),
    getLead: async (leadId) =>
      (await createRuntimeProductApi()).getLead!(leadId),
    listActivities: async (leadId) =>
      createProductCrmApi(await createProductCrmApiOptions()).listActivities(
        leadId,
      ),
    listLeadBoard: async (query) =>
      createProductCrmApi(await createProductCrmApiOptions()).listLeadBoard(
        query,
      ),
    listLeadPage: async (query) =>
      createProductCrmApi(await createProductCrmApiOptions()).listLeadPage(
        query,
      ),
    listLeads: async (query) =>
      createProductCrmApi(await createProductCrmApiOptions()).listLeads(query),
    listPipelines: async () =>
      createProductCrmApi(await createProductCrmApiOptions()).listPipelines(),
    moveLeadPipelineStage: async (leadId, input) =>
      createProductCrmApi(
        await createProductCrmApiOptions(),
      ).moveLeadPipelineStage(leadId, input),
    restoreLead: async (leadId) =>
      (await createRuntimeProductApi()).restoreLead!(leadId),
    updatePipeline: async (pipelineId, input) =>
      createProductCrmApi(await createProductCrmApiOptions()).updatePipeline(
        pipelineId,
        input,
      ),
    updateLead: async (leadId, input) =>
      createProductCrmApi(await createProductCrmApiOptions()).updateLead(
        leadId,
        input,
      ),
  };
}

async function createRuntimeProductApi() {
  return createProductCrmApi(await createProductCrmApiOptions());
}

export function createRuntimeCrmConversationApi(): CrmConversationApi {
  return {
    getStatistics: async (input, options) =>
      createCrmConversationApi(
        await createProductCrmApiOptions(),
      ).getStatistics(input, options),
    addCycleTag: async (cycleId, input) =>
      createCrmConversationApi(await createProductCrmApiOptions()).addCycleTag(
        cycleId,
        input,
      ),
    assignCycle: async (cycleId, input) =>
      createCrmConversationApi(await createProductCrmApiOptions()).assignCycle(
        cycleId,
        input,
      ),
    authorizeComposioConnection: async (connectionId) =>
      createCrmConversationApi(
        await createProductCrmApiOptions(),
      ).authorizeComposioConnection(connectionId),
    closeCycle: async (cycleId, input) =>
      createCrmConversationApi(await createProductCrmApiOptions()).closeCycle(
        cycleId,
        input,
      ),
    completeComposioConnection: async (connectionId) =>
      createCrmConversationApi(
        await createProductCrmApiOptions(),
      ).completeComposioConnection(connectionId),
    cancelCampaign: async (campaignId) =>
      createCrmConversationApi(
        await createProductCrmApiOptions(),
      ).cancelCampaign(campaignId),
    createCampaign: async (input) =>
      createCrmConversationApi(
        await createProductCrmApiOptions(),
      ).createCampaign(input),
    createConnection: async (input) =>
      createCrmConversationApi(
        await createProductCrmApiOptions(),
      ).createConnection(input),
    disconnectZapiConnection: async (connectionId) =>
      createCrmConversationApi(
        await createProductCrmApiOptions(),
      ).disconnectZapiConnection(connectionId),
    repairZapiConnectionCredentials: async (connectionId, input) =>
      createCrmConversationApi(
        await createProductCrmApiOptions(),
      ).repairZapiConnectionCredentials(connectionId, input),
    replaceZapiConnection: async (connectionId, input) =>
      createCrmConversationApi(
        await createProductCrmApiOptions(),
      ).replaceZapiConnection(connectionId, input),
    getZapiReplacementStatus: async (connectionId, operationId) =>
      createCrmConversationApi(
        await createProductCrmApiOptions(),
      ).getZapiReplacementStatus(connectionId, operationId),
    configureZapiWebhooks: async (connectionId) =>
      createCrmConversationApi(
        await createProductCrmApiOptions(),
      ).configureZapiWebhooks(connectionId),
    createQuickMessage: async (input) =>
      createCrmConversationApi(
        await createProductCrmApiOptions(),
      ).createQuickMessage(input),
    createScheduledMessage: async (input) =>
      createCrmConversationApi(
        await createProductCrmApiOptions(),
      ).createScheduledMessage(input),
    createTag: async (input) =>
      createCrmConversationApi(await createProductCrmApiOptions()).createTag(
        input,
      ),
    deleteQuickMessage: async (quickMessageId) =>
      createCrmConversationApi(
        await createProductCrmApiOptions(),
      ).deleteQuickMessage(quickMessageId),
    deleteTag: async (tagId) =>
      createCrmConversationApi(await createProductCrmApiOptions()).deleteTag(
        tagId,
      ),
    deleteMessage: async (messageId) =>
      createCrmConversationApi(
        await createProductCrmApiOptions(),
      ).deleteMessage(messageId),
    updateCycleAttendance: async (cycleId, input) =>
      createCrmConversationApi(
        await createProductCrmApiOptions(),
      ).updateCycleAttendance(cycleId, input),
    getBotIntegration: async () =>
      createCrmConversationApi(
        await createProductCrmApiOptions(),
      ).getBotIntegration(),
    getRoutingPolicy: async () =>
      createCrmConversationApi(
        await createProductCrmApiOptions(),
      ).getRoutingPolicy(),
    getCampaign: async (campaignId) =>
      createCrmConversationApi(await createProductCrmApiOptions()).getCampaign(
        campaignId,
      ),
    listConnections: async () =>
      createCrmConversationApi(
        await createProductCrmApiOptions(),
      ).listConnections(),
    updateBotIntegration: async (input) =>
      createCrmConversationApi(
        await createProductCrmApiOptions(),
      ).updateBotIntegration(input),
    updateRoutingPolicy: async (input) =>
      createCrmConversationApi(
        await createProductCrmApiOptions(),
      ).updateRoutingPolicy(input),
    listMessages: async (cycleId, query) =>
      createCrmConversationApi(await createProductCrmApiOptions()).listMessages(
        cycleId,
        query,
      ),
    listCatalogProducts: async (input) =>
      createCrmConversationApi(
        await createProductCrmApiOptions(),
      ).listCatalogProducts(input),
    listCampaigns: async (input) =>
      createCrmConversationApi(
        await createProductCrmApiOptions(),
      ).listCampaigns(input),
    listQuickMessages: async () =>
      createCrmConversationApi(
        await createProductCrmApiOptions(),
      ).listQuickMessages(),
    listScheduledMessages: async (input) =>
      createCrmConversationApi(
        await createProductCrmApiOptions(),
      ).listScheduledMessages(input),
    listTags: async (input) =>
      createCrmConversationApi(await createProductCrmApiOptions()).listTags(
        input,
      ),
    listProviderEventIssues: async () =>
      createCrmConversationApi(
        await createProductCrmApiOptions(),
      ).listProviderEventIssues(),
    markCycleRead: async (cycleId, input) =>
      createCrmConversationApi(
        await createProductCrmApiOptions(),
      ).markCycleRead(cycleId, input),
    markCycleUnread: async (cycleId, input) =>
      createCrmConversationApi(
        await createProductCrmApiOptions(),
      ).markCycleUnread(cycleId, input),
    concludeCycle: async (cycleId, input) =>
      createCrmConversationApi(
        await createProductCrmApiOptions(),
      ).concludeCycle(cycleId, input),
    listConversationCycles: async (query) =>
      createCrmConversationApi(
        await createProductCrmApiOptions(),
      ).listConversationCycles(query),
    listConversationCycleCounts: async (query) =>
      createCrmConversationApi(
        await createProductCrmApiOptions(),
      ).listConversationCycleCounts(query),
    removeCycleTag: async (cycleId, tagId) =>
      createCrmConversationApi(
        await createProductCrmApiOptions(),
      ).removeCycleTag(cycleId, tagId),
    cancelScheduledMessage: async (scheduledMessageId) =>
      createCrmConversationApi(
        await createProductCrmApiOptions(),
      ).cancelScheduledMessage(scheduledMessageId),
    processDueScheduledMessages: async (input) =>
      createCrmConversationApi(
        await createProductCrmApiOptions(),
      ).processDueScheduledMessages(input),
    pauseCampaign: async (campaignId) =>
      createCrmConversationApi(
        await createProductCrmApiOptions(),
      ).pauseCampaign(campaignId),
    reorderTags: async (input) =>
      createCrmConversationApi(await createProductCrmApiOptions()).reorderTags(
        input,
      ),
    removeReaction: async (messageId) =>
      createCrmConversationApi(
        await createProductCrmApiOptions(),
      ).removeReaction(messageId),
    requestZapiPairingCode: async (connectionId, phone) =>
      createCrmConversationApi(
        await createProductCrmApiOptions(),
      ).requestZapiPairingCode(connectionId, phone),
    requestZapiPairingQr: async (connectionId) =>
      createCrmConversationApi(
        await createProductCrmApiOptions(),
      ).requestZapiPairingQr(connectionId),
    refreshZapiConnectionStatus: async (connectionId) =>
      createCrmConversationApi(
        await createProductCrmApiOptions(),
      ).refreshZapiConnectionStatus(connectionId),
    retryOlxChatSetup: async (connectionId) =>
      createCrmConversationApi(
        await createProductCrmApiOptions(),
      ).retryOlxChatSetup(connectionId),
    retryProviderEvent: async (eventId) =>
      createCrmConversationApi(
        await createProductCrmApiOptions(),
      ).retryProviderEvent(eventId),
    resumeCampaign: async (campaignId) =>
      createCrmConversationApi(
        await createProductCrmApiOptions(),
      ).resumeCampaign(campaignId),
    sendCatalog: async (input) =>
      createCrmConversationApi(await createProductCrmApiOptions()).sendCatalog(
        input,
      ),
    sendCatalogProduct: async (input) =>
      createCrmConversationApi(
        await createProductCrmApiOptions(),
      ).sendCatalogProduct(input),
    sendLocation: async (input) =>
      createCrmConversationApi(await createProductCrmApiOptions()).sendLocation(
        input,
      ),
    sendMedia: async (input) =>
      createCrmConversationApi(await createProductCrmApiOptions()).sendMedia(
        input,
      ),
    sendReaction: async (messageId, input) =>
      createCrmConversationApi(await createProductCrmApiOptions()).sendReaction(
        messageId,
        input,
      ),
    selectComposioSender: async (connectionId, senderId) =>
      createCrmConversationApi(
        await createProductCrmApiOptions(),
      ).selectComposioSender(connectionId, senderId),
    sendQuickMessage: async (input) =>
      createCrmConversationApi(
        await createProductCrmApiOptions(),
      ).sendQuickMessage(input),
    sendText: async (input) =>
      createCrmConversationApi(await createProductCrmApiOptions()).sendText(
        input,
      ),
    sendVehicle: async (input) =>
      createCrmConversationApi(await createProductCrmApiOptions()).sendVehicle(
        input,
      ),
    startConversation: async (input) =>
      createCrmConversationApi(
        await createProductCrmApiOptions(),
      ).startConversation(input),
    updateQuickMessage: async (quickMessageId, input) =>
      createCrmConversationApi(
        await createProductCrmApiOptions(),
      ).updateQuickMessage(quickMessageId, input),
    updateTag: async (tagId, input) =>
      createCrmConversationApi(await createProductCrmApiOptions()).updateTag(
        tagId,
        input,
      ),
    subscribeEvents: (input) => {
      let unsubscribe: (() => void) | null = null;
      let closed = false;
      void createProductCrmApiOptions()
        .then((options) => {
          if (closed) return;
          unsubscribe =
            createCrmConversationApi(options).subscribeEvents(input);
        })
        .catch((error) => {
          input.onError?.(
            error instanceof Error ? error : new Error(String(error)),
          );
        });
      return () => {
        closed = true;
        unsubscribe?.();
      };
    },
  };
}

export async function createProductCrmApiOptions(): Promise<CreateProductCrmApiOptions> {
  const accessToken = await readClerkToken();

  return {
    auth: createProductCrmAuthFromEnv(accessToken),
    fetch: createRuntimeFetch(),
    ...readCrmBaseUrl(),
  };
}

type CrmRuntimeEnv = {
  VITE_DEV_CLERK_SESSION_TOKEN?: string;
  VITE_DEV_CLERK_USER_ID?: string;
  VITE_DEV_STORE_SLUG?: string;
};

export function createProductCrmAuthFromEnv(
  accessToken?: string | null,
  env: CrmRuntimeEnv = import.meta.env as CrmRuntimeEnv,
): ProductCrmAuth {
  const explicitDevToken = env.VITE_DEV_CLERK_SESSION_TOKEN?.trim();
  const auth = createRuntimeActorAuth(accessToken ?? explicitDevToken, env);
  const storeSlug = auth.storeSlug ?? readRuntimeStoreSlug(env);
  const clerkUserId = auth.clerkUserId ?? env.VITE_DEV_CLERK_USER_ID;

  return {
    ...(auth.accessToken ? { accessToken: auth.accessToken } : {}),
    ...(clerkUserId ? { clerkUserId } : {}),
    ...(storeSlug ? { storeSlug } : {}),
  };
}

function readCrmBaseUrl(): Pick<CreateProductCrmApiOptions, "baseUrl"> {
  return readRuntimeApiBaseUrl();
}
