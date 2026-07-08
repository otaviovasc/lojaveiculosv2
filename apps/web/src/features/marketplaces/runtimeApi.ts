import {
  createMarketplaceApi,
  type CreateMarketplaceApiOptions,
} from "./apiClient";
import type { MarketplaceApi } from "./apiClient";
import type { MarketplaceAuth } from "./types";
import {
  createRuntimeActorAuth,
  readClerkToken,
  readRuntimeApiBaseUrl,
} from "../account/runtimeAuth";

export async function createMarketplaceApiOptions(): Promise<CreateMarketplaceApiOptions> {
  const accessToken = await readClerkToken();
  return {
    auth: createMarketplaceAuthFromEnv(accessToken),
    fetch: window.fetch.bind(window),
    ...readBaseUrl(),
  };
}

export function createMarketplaceRuntimeApi(): MarketplaceApi {
  return {
    completeConnection: async (input) =>
      createMarketplaceApi(
        await createMarketplaceApiOptions(),
      ).completeConnection(input),
    createConnectUrl: async (input) =>
      createMarketplaceApi(
        await createMarketplaceApiOptions(),
      ).createConnectUrl(input),
    createSyncJob: async (provider, input) =>
      createMarketplaceApi(await createMarketplaceApiOptions()).createSyncJob(
        provider,
        input,
      ),
    getOverview: async () =>
      createMarketplaceApi(await createMarketplaceApiOptions()).getOverview(),
    previewStockSync: async (provider, input) =>
      createMarketplaceApi(
        await createMarketplaceApiOptions(),
      ).previewStockSync(provider, input),
    retrySyncJob: async (jobId, input) =>
      createMarketplaceApi(await createMarketplaceApiOptions()).retrySyncJob(
        jobId,
        input,
      ),
    runSyncJob: async (jobId) =>
      createMarketplaceApi(await createMarketplaceApiOptions()).runSyncJob(
        jobId,
      ),
    runStockSync: async (provider, input) =>
      createMarketplaceApi(await createMarketplaceApiOptions()).runStockSync(
        provider,
        input,
      ),
    upsertAccount: async (provider, input) =>
      createMarketplaceApi(await createMarketplaceApiOptions()).upsertAccount(
        provider,
        input,
      ),
  };
}

function createMarketplaceAuthFromEnv(
  accessToken?: string | null,
): MarketplaceAuth {
  return createRuntimeActorAuth(accessToken);
}

function readBaseUrl(): Pick<CreateMarketplaceApiOptions, "baseUrl"> {
  return readRuntimeApiBaseUrl();
}
