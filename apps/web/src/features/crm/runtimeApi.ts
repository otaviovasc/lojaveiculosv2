import {
  createProductCrmApi,
  type CreateProductCrmApiOptions,
  type ProductCrmApi,
} from "./productCrmApi";
import { createCrmWhatsappApi, type CrmWhatsappApi } from "./crmWhatsappApi";
import type { ProductCrmAuth } from "./productCrmTypes";
import { readRuntimeStoreSlug } from "../account/currentStore";
import {
  createRuntimeActorAuth,
  readClerkToken,
  readRuntimeApiBaseUrl,
} from "../account/runtimeAuth";

export function createRuntimeProductCrmApi(): ProductCrmApi {
  return {
    createActivity: async (leadId, input) =>
      createProductCrmApi(await createProductCrmApiOptions()).createActivity(
        leadId,
        input,
      ),
    createLead: async (input) =>
      createProductCrmApi(await createProductCrmApiOptions()).createLead(input),
    listActivities: async (leadId) =>
      createProductCrmApi(await createProductCrmApiOptions()).listActivities(
        leadId,
      ),
    listLeads: async (query) =>
      createProductCrmApi(await createProductCrmApiOptions()).listLeads(query),
    updateLead: async (leadId, input) =>
      createProductCrmApi(await createProductCrmApiOptions()).updateLead(
        leadId,
        input,
      ),
  };
}

export function createRuntimeCrmWhatsappApi(): CrmWhatsappApi {
  return {
    addSessionTag: async (sessionId, input) =>
      createCrmWhatsappApi(await createProductCrmApiOptions()).addSessionTag(
        sessionId,
        input,
      ),
    assignSession: async (sessionId, input) =>
      createCrmWhatsappApi(await createProductCrmApiOptions()).assignSession(
        sessionId,
        input,
      ),
    closeSession: async (sessionId) =>
      createCrmWhatsappApi(await createProductCrmApiOptions()).closeSession(
        sessionId,
      ),
    createQuickMessage: async (input) =>
      createCrmWhatsappApi(
        await createProductCrmApiOptions(),
      ).createQuickMessage(input),
    deleteQuickMessage: async (quickMessageId) =>
      createCrmWhatsappApi(
        await createProductCrmApiOptions(),
      ).deleteQuickMessage(quickMessageId),
    deleteMessage: async (messageId) =>
      createCrmWhatsappApi(await createProductCrmApiOptions()).deleteMessage(
        messageId,
      ),
    interveneSession: async (sessionId, input) =>
      createCrmWhatsappApi(await createProductCrmApiOptions()).interveneSession(
        sessionId,
        input,
      ),
    listConnections: async () =>
      createCrmWhatsappApi(
        await createProductCrmApiOptions(),
      ).listConnections(),
    listMessages: async (sessionId, query) =>
      createCrmWhatsappApi(await createProductCrmApiOptions()).listMessages(
        sessionId,
        query,
      ),
    listCatalogProducts: async (input) =>
      createCrmWhatsappApi(
        await createProductCrmApiOptions(),
      ).listCatalogProducts(input),
    listQuickMessages: async () =>
      createCrmWhatsappApi(
        await createProductCrmApiOptions(),
      ).listQuickMessages(),
    listTags: async (input) =>
      createCrmWhatsappApi(await createProductCrmApiOptions()).listTags(input),
    listFailedProviderEvents: async () =>
      createCrmWhatsappApi(
        await createProductCrmApiOptions(),
      ).listFailedProviderEvents(),
    markSessionRead: async (sessionId) =>
      createCrmWhatsappApi(await createProductCrmApiOptions()).markSessionRead(
        sessionId,
      ),
    markSessionUnread: async (sessionId) =>
      createCrmWhatsappApi(
        await createProductCrmApiOptions(),
      ).markSessionUnread(sessionId),
    listSessions: async (query) =>
      createCrmWhatsappApi(await createProductCrmApiOptions()).listSessions(
        query,
      ),
    listSessionCounts: async (query) =>
      createCrmWhatsappApi(
        await createProductCrmApiOptions(),
      ).listSessionCounts(query),
    removeSessionTag: async (sessionId, tagId) =>
      createCrmWhatsappApi(await createProductCrmApiOptions()).removeSessionTag(
        sessionId,
        tagId,
      ),
    removeReaction: async (messageId) =>
      createCrmWhatsappApi(await createProductCrmApiOptions()).removeReaction(
        messageId,
      ),
    retryProviderEvent: async (eventId) =>
      createCrmWhatsappApi(
        await createProductCrmApiOptions(),
      ).retryProviderEvent(eventId),
    sendCatalog: async (input) =>
      createCrmWhatsappApi(await createProductCrmApiOptions()).sendCatalog(
        input,
      ),
    sendCatalogProduct: async (input) =>
      createCrmWhatsappApi(
        await createProductCrmApiOptions(),
      ).sendCatalogProduct(input),
    sendLocation: async (input) =>
      createCrmWhatsappApi(await createProductCrmApiOptions()).sendLocation(
        input,
      ),
    sendMedia: async (input) =>
      createCrmWhatsappApi(await createProductCrmApiOptions()).sendMedia(input),
    sendReaction: async (messageId, input) =>
      createCrmWhatsappApi(await createProductCrmApiOptions()).sendReaction(
        messageId,
        input,
      ),
    sendQuickMessage: async (input) =>
      createCrmWhatsappApi(await createProductCrmApiOptions()).sendQuickMessage(
        input,
      ),
    sendText: async (input) =>
      createCrmWhatsappApi(await createProductCrmApiOptions()).sendText(input),
    sendVehicle: async (input) =>
      createCrmWhatsappApi(await createProductCrmApiOptions()).sendVehicle(
        input,
      ),
    startConversation: async (input) =>
      createCrmWhatsappApi(
        await createProductCrmApiOptions(),
      ).startConversation(input),
    updateQuickMessage: async (quickMessageId, input) =>
      createCrmWhatsappApi(
        await createProductCrmApiOptions(),
      ).updateQuickMessage(quickMessageId, input),
    subscribeEvents: (input) => {
      let unsubscribe: (() => void) | null = null;
      let closed = false;
      void createProductCrmApiOptions()
        .then((options) => {
          if (closed) return;
          unsubscribe = createCrmWhatsappApi(options).subscribeEvents(input);
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
    fetch: window.fetch.bind(window),
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
