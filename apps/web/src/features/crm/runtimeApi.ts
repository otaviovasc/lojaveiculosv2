import {
  createProductCrmApi,
  type CreateProductCrmApiOptions,
  type ProductCrmApi,
} from "./productCrmApi";
import {
  createCrmWhatsappApi,
  type CrmWhatsappApi,
} from "./crmWhatsappApi";
import type { ProductCrmAuth } from "./productCrmTypes";

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
    assignSession: async (sessionId, agentId) =>
      createCrmWhatsappApi(await createProductCrmApiOptions()).assignSession(
        sessionId,
        agentId,
      ),
    bootstrap: async () =>
      createCrmWhatsappApi(await createProductCrmApiOptions()).bootstrap(),
    closeSession: async (sessionId, mode) =>
      createCrmWhatsappApi(await createProductCrmApiOptions()).closeSession(
        sessionId,
        mode,
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
    markSessionAsRead: async (sessionId) =>
      createCrmWhatsappApi(await createProductCrmApiOptions()).markSessionAsRead(
        sessionId,
      ),
    markSessionAsUnread: async (sessionId, lastReadAt) =>
      createCrmWhatsappApi(
        await createProductCrmApiOptions(),
      ).markSessionAsUnread(sessionId, lastReadAt),
    sendText: async (input) =>
      createCrmWhatsappApi(await createProductCrmApiOptions()).sendText(input),
    toggleIntervention: async (sessionId) =>
      createCrmWhatsappApi(
        await createProductCrmApiOptions(),
      ).toggleIntervention(sessionId),
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

function createProductCrmAuthFromEnv(
  accessToken?: string | null,
): ProductCrmAuth {
  const env = import.meta.env as {
    DEV?: boolean;
    VITE_DEV_CLERK_USER_ID?: string;
    VITE_DEV_STORE_SLUG?: string;
  };
  const clerkUserId =
    env.VITE_DEV_CLERK_USER_ID ?? (env.DEV ? "clerk_test_user" : undefined);
  const storeSlug =
    env.VITE_DEV_STORE_SLUG ?? (env.DEV ? "test-store" : undefined);

  return {
    ...(accessToken ? { accessToken } : {}),
    ...(clerkUserId ? { clerkUserId } : {}),
    ...(storeSlug ? { storeSlug } : {}),
  };
}

function readCrmBaseUrl(): Pick<CreateProductCrmApiOptions, "baseUrl"> {
  const env = import.meta.env as { VITE_API_BASE_URL?: string };
  return env.VITE_API_BASE_URL ? { baseUrl: env.VITE_API_BASE_URL } : {};
}

async function readClerkToken() {
  const clerk = (window as Window & ClerkRuntime).Clerk;

  return (await clerk?.session?.getToken?.()) ?? null;
}

type ClerkRuntime = {
  Clerk?: {
    session?: {
      getToken?: () => Promise<string | null>;
    };
  };
};
