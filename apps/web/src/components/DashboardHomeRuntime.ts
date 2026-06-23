import {
  createAnalyticsApi,
  type AnalyticsApi,
} from "../features/analytics/apiClient";
import { createAnalyticsApiOptions } from "../features/analytics/runtimeApi";

export function createRuntimeAnalyticsApi(): AnalyticsApi {
  return {
    getDashboard: async () =>
      createAnalyticsApi(await createAnalyticsApiOptions()).getDashboard(),
  };
}
