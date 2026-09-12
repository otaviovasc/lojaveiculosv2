import {
  createAnalyticsApi,
  type AnalyticsApi,
} from "../features/analytics/apiClient";
import { createAnalyticsApiOptions } from "../features/analytics/runtimeApi";

export function createRuntimeAnalyticsApi(): AnalyticsApi {
  return {
    getDashboard: async (period) =>
      createAnalyticsApi(await createAnalyticsApiOptions()).getDashboard(
        period,
      ),
    getHomeDashboard: async () =>
      createAnalyticsApi(await createAnalyticsApiOptions()).getHomeDashboard(),
  };
}
