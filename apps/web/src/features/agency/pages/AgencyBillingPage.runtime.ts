import {
  createRuntimeActorAuth,
  createRuntimeFetch,
  readClerkToken,
  readRuntimeApiBaseUrl,
} from "../../account/runtimeAuth";
import { createAgencyApi, type AgencyApi } from "../apiClient";

export async function createRuntimeAgencyBillingApi(): Promise<AgencyApi> {
  const token = await readClerkToken();
  return createAgencyApi({
    auth: createRuntimeActorAuth(token),
    fetch: createRuntimeFetch(),
    ...readRuntimeApiBaseUrl(),
  });
}
