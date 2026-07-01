import type { CreateSalesApiOptions } from "./apiClient";
import type { SalesAuth } from "./types";
import {
  createRuntimeActorAuth,
  readClerkToken,
  readRuntimeApiBaseUrl,
} from "../account/runtimeAuth";

export async function createSalesApiOptions(): Promise<CreateSalesApiOptions> {
  const accessToken = await readClerkToken();

  return {
    auth: createSalesAuth(accessToken),
    fetch: window.fetch.bind(window),
    ...readBaseUrl(),
  };
}

function createSalesAuth(accessToken?: string | null): SalesAuth {
  return createRuntimeActorAuth(accessToken);
}

function readBaseUrl(): Pick<CreateSalesApiOptions, "baseUrl"> {
  return readRuntimeApiBaseUrl();
}
