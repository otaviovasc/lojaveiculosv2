import {
  createRuntimeActorAuth,
  createRuntimeFetch,
  readClerkToken,
  readRuntimeApiBaseUrl,
} from "../../account/runtimeAuth";
import {
  createAgencyTeamAccessApi,
  type AgencyTeamAccessApi,
} from "../teamAccessApiClient";

export async function createRuntimeAgencyTeamAccessApi(): Promise<AgencyTeamAccessApi> {
  const token = await readClerkToken();
  return createAgencyTeamAccessApi({
    auth: createRuntimeActorAuth(token),
    fetch: createRuntimeFetch(),
    ...readRuntimeApiBaseUrl(),
  });
}
