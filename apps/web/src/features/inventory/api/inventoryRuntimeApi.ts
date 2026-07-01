import type { CreateInventoryApiOptions } from "./apiClient";
import type { InventoryAuth } from "../model/types";
import {
  createRuntimeActorAuth,
  createRuntimeAuthHeaders,
  readClerkToken,
  readRuntimeApiBaseUrl,
} from "../../account/runtimeAuth";

export async function createInventoryApiOptions(): Promise<CreateInventoryApiOptions> {
  const accessToken = await readClerkToken();

  return {
    auth: createInventoryAuthFromEnv(accessToken),
    fetch: window.fetch.bind(window),
    ...readInventoryBaseUrl(),
  };
}

export async function createInventoryRuntimeHeaders() {
  return createRuntimeAuthHeaders();
}

function createInventoryAuthFromEnv(
  accessToken?: string | null,
): InventoryAuth {
  return createRuntimeActorAuth(accessToken);
}

function readInventoryBaseUrl(): Pick<CreateInventoryApiOptions, "baseUrl"> {
  return readRuntimeApiBaseUrl();
}
