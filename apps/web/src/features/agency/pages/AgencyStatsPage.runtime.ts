import {
  createRuntimeActorAuth,
  createRuntimeFetch,
  readClerkToken,
  readRuntimeApiBaseUrl,
} from "../../account/runtimeAuth";
import { createAgencyApi, type AgencyApi } from "../apiClient";

export type AgencyStatsApi = AgencyApi & Required<Pick<AgencyApi, "getStats">>;

export async function createRuntimeAgencyStatsApi(): Promise<AgencyStatsApi> {
  const token = await readClerkToken();
  return createAgencyApi({
    auth: createRuntimeActorAuth(token),
    fetch: createRuntimeFetch(),
    ...readRuntimeApiBaseUrl(),
  }) as AgencyStatsApi;
}
