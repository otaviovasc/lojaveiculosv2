import type { CreateDocumentsApiOptions } from "./apiClient";
import type { DocumentsAuth } from "./types";
import {
  createRuntimeActorAuth,
  createRuntimeFetch,
  readClerkToken,
  readRuntimeApiBaseUrl,
} from "../account/runtimeAuth";

export async function createDocumentsApiOptions(): Promise<CreateDocumentsApiOptions> {
  const accessToken = await readClerkToken();

  return {
    auth: createDocumentsAuthFromEnv(accessToken),
    fetch: createRuntimeFetch(),
    ...readDocumentsBaseUrl(),
  };
}

function createDocumentsAuthFromEnv(
  accessToken?: string | null,
): DocumentsAuth {
  return createRuntimeActorAuth(accessToken);
}

function readDocumentsBaseUrl(): Pick<CreateDocumentsApiOptions, "baseUrl"> {
  return readRuntimeApiBaseUrl();
}
