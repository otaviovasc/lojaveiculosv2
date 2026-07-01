import type { CreatePublicApiOptions } from "./apiClient";
import type { PublicApiAuth } from "./types";
import {
  createRuntimeActorAuth,
  readClerkToken,
  readRuntimeApiBaseUrl,
} from "../account/runtimeAuth";

export async function createPublicApiOptions(): Promise<CreatePublicApiOptions> {
  const accessToken = await readClerkToken();
  return {
    auth: createAuthFromEnv(accessToken),
    fetch: window.fetch.bind(window),
    ...readBaseUrl(),
  };
}

function createAuthFromEnv(accessToken?: string | null): PublicApiAuth {
  return createRuntimeActorAuth(accessToken);
}

function readBaseUrl(): Pick<CreatePublicApiOptions, "baseUrl"> {
  return readRuntimeApiBaseUrl();
}
