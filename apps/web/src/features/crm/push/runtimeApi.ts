import {
  createRuntimeAuthHeaders,
  createRuntimeFetch,
  readRuntimeApiBaseUrl,
} from "../../account/runtimeAuth";
import { createCrmPushApi, type CrmPushApi } from "./apiClient";

export function createRuntimeCrmPushApi(): CrmPushApi {
  return createCrmPushApi({
    fetch: createRuntimeFetch(),
    headers: () => createRuntimeAuthHeaders(),
    ...readRuntimeApiBaseUrl(),
  });
}
