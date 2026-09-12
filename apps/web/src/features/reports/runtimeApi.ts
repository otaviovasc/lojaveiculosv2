import type { CreateReportsApiOptions } from "./apiClient";
import type { ReportsAuth } from "./types";
import {
  createRuntimeActorAuth,
  createRuntimeFetch,
  readClerkToken,
  readRuntimeApiBaseUrl,
} from "../account/runtimeAuth";

export async function createReportsApiOptions(): Promise<CreateReportsApiOptions> {
  const accessToken = await readClerkToken();
  const auth: ReportsAuth = createRuntimeActorAuth(accessToken);

  return {
    auth,
    fetch: createRuntimeFetch(),
    ...readBaseUrl(),
  };
}

function readBaseUrl(): Pick<CreateReportsApiOptions, "baseUrl"> {
  return readRuntimeApiBaseUrl();
}
