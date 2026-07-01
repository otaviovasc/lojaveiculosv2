import type { CreateFiscalApiOptions } from "./apiClient";
import type { FiscalAuth } from "./types";
import {
  createRuntimeActorAuth,
  readClerkToken,
  readRuntimeApiBaseUrl,
} from "../account/runtimeAuth";

export async function createFiscalApiOptions(): Promise<CreateFiscalApiOptions> {
  const accessToken = await readClerkToken();
  return {
    auth: createAuthFromEnv(accessToken),
    fetch: window.fetch.bind(window),
    ...readBaseUrl(),
  };
}

function createAuthFromEnv(accessToken?: string | null): FiscalAuth {
  return createRuntimeActorAuth(accessToken);
}

function readBaseUrl(): Pick<CreateFiscalApiOptions, "baseUrl"> {
  return readRuntimeApiBaseUrl();
}
