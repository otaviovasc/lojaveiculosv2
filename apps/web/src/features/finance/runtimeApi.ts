import type { CreateFinanceApiOptions } from "./apiClient";
import type { FinanceAuth } from "./types";
import {
  createRuntimeActorAuth,
  createRuntimeFetch,
  readClerkToken,
  readRuntimeApiBaseUrl,
} from "../account/runtimeAuth";

export async function createFinanceApiOptions(): Promise<CreateFinanceApiOptions> {
  const accessToken = await readClerkToken();

  return {
    auth: createFinanceAuthFromEnv(accessToken),
    fetch: createRuntimeFetch(),
    ...readFinanceBaseUrl(),
  };
}

function createFinanceAuthFromEnv(accessToken?: string | null): FinanceAuth {
  return createRuntimeActorAuth(accessToken);
}

function readFinanceBaseUrl(): Pick<CreateFinanceApiOptions, "baseUrl"> {
  return readRuntimeApiBaseUrl();
}
