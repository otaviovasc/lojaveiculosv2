import type { CreateAnalyticsApiOptions } from "./apiClient";
import type { AnalyticsAuth } from "./types";
import {
  createRuntimeActorAuth,
  createRuntimeFetch,
  readClerkToken,
  readRuntimeApiBaseUrl,
} from "../account/runtimeAuth";

export async function createAnalyticsApiOptions(): Promise<CreateAnalyticsApiOptions> {
  const accessToken = await readClerkToken();
  return {
    auth: createAuthFromEnv(accessToken),
    fetch: createRuntimeFetch(),
    ...readBaseUrl(),
  };
}

function createAuthFromEnv(accessToken?: string | null): AnalyticsAuth {
  return createRuntimeActorAuth(accessToken);
}

function readBaseUrl(): Pick<CreateAnalyticsApiOptions, "baseUrl"> {
  return readRuntimeApiBaseUrl();
}
