import type { CreateMarketplaceApiOptions } from "./apiClient";
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

function createMarketplaceAuthFromEnv(
  accessToken?: string | null,
): MarketplaceAuth {
  return createRuntimeActorAuth(accessToken);
}

function readBaseUrl(): Pick<CreateMarketplaceApiOptions, "baseUrl"> {
  return readRuntimeApiBaseUrl();
}
