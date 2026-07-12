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

export function readPublicApiDeploymentBaseUrl() {
  const { baseUrl } = readRuntimeApiBaseUrl();
  return resolvePublicApiDeploymentBaseUrl(baseUrl, window.location.origin);
}

export function resolvePublicApiDeploymentBaseUrl(
  apiBaseUrl: string | undefined,
  currentOrigin: string,
) {
  const resolved = new URL(apiBaseUrl ?? "/api/v1", currentOrigin);
  resolved.pathname = resolved.pathname.replace(/\/api\/v1\/?$/, "");
  resolved.search = "";
  resolved.hash = "";
  return resolved.toString().replace(/\/$/, "");
}

function createAuthFromEnv(accessToken?: string | null): PublicApiAuth {
  return createRuntimeActorAuth(accessToken);
}

function readBaseUrl(): Pick<CreatePublicApiOptions, "baseUrl"> {
  return readRuntimeApiBaseUrl();
}
