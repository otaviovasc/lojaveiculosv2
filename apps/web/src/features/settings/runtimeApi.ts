import type { CreateSettingsApiOptions } from "./apiClient";
import type { SettingsAuth } from "./types";
import {
  createRuntimeActorAuth,
  createRuntimeFetch,
  readClerkToken,
  readRuntimeApiBaseUrl,
} from "../account/runtimeAuth";

export async function createSettingsApiOptions(): Promise<CreateSettingsApiOptions> {
  const accessToken = await readClerkToken();
  return {
    auth: createSettingsAuthFromEnv(accessToken),
    fetch: createRuntimeFetch(),
    ...readBaseUrl(),
  };
}

function createSettingsAuthFromEnv(accessToken?: string | null): SettingsAuth {
  return createRuntimeActorAuth(accessToken);
}

function readBaseUrl(): Pick<CreateSettingsApiOptions, "baseUrl"> {
  return readRuntimeApiBaseUrl();
}
