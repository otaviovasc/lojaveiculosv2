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
    assignSession: async (sessionId, agentId, connectionId) =>
      createCrmWhatsappApi(await createProductCrmApiOptions()).assignSession(
        sessionId,
        agentId,
        connectionId,
      ),
    bootstrap: async () =>
      createCrmWhatsappApi(await createProductCrmApiOptions()).bootstrap(),
    closeSession: async (sessionId, mode, connectionId) =>
      createCrmWhatsappApi(await createProductCrmApiOptions()).closeSession(
        sessionId,
        mode,
        connectionId,
      ),
    createSession: async (input) =>
      createCrmWhatsappApi(await createProductCrmApiOptions()).createSession(
        input,
      ),
    listMessages: async (sessionId, query) =>
      createCrmWhatsappApi(await createProductCrmApiOptions()).listMessages(
        sessionId,
        query,
      ),
    listSessions: async (query) =>
      createCrmWhatsappApi(await createProductCrmApiOptions()).listSessions(
        query,
      ),
    markSessionAsRead: async (sessionId, connectionId) =>
      createCrmWhatsappApi(
        await createProductCrmApiOptions(),
      ).markSessionAsRead(sessionId, connectionId),
    markSessionAsUnread: async (sessionId, lastReadAt, connectionId) =>
      createCrmWhatsappApi(
        await createProductCrmApiOptions(),
      ).markSessionAsUnread(sessionId, lastReadAt, connectionId),
    sendText: async (input) =>
      createCrmWhatsappApi(await createProductCrmApiOptions()).sendText(input),
    toggleIntervention: async (sessionId, connectionId) =>
      createCrmWhatsappApi(
        await createProductCrmApiOptions(),
      ).toggleIntervention(sessionId, connectionId),
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
