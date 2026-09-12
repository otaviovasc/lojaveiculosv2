import type { CreateBillingApiOptions } from "./apiClient";
import type { BillingAuth } from "./types";
import {
  createRuntimeActorAuth,
  createRuntimeFetch,
  readClerkToken,
  readRuntimeApiBaseUrl,
} from "../account/runtimeAuth";

export async function createBillingApiOptions(): Promise<CreateBillingApiOptions> {
  const accessToken = await readClerkToken();
  return {
    auth: createBillingAuthFromEnv(accessToken),
    fetch: createRuntimeFetch(),
    ...readBaseUrl(),
  };
}

function createBillingAuthFromEnv(accessToken?: string | null): BillingAuth {
  return createRuntimeActorAuth(accessToken);
}

function readBaseUrl(): Pick<CreateBillingApiOptions, "baseUrl"> {
  return readRuntimeApiBaseUrl();
}
