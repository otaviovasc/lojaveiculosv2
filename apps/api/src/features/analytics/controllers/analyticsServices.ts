import type { ServiceContext } from "../../../shared/serviceContext.js";
import type {
  AnalyticsDashboard,
  AnalyticsPeriod,
} from "../../../domains/analytics/ports/analyticsRepository.js";
import { getAnalyticsDashboard } from "../../../domains/analytics/services/AnalyticsService/getAnalyticsDashboard.js";
import type { AnalyticsServicePorts } from "../../../domains/analytics/services/AnalyticsService/serviceSupport.js";
import { createMemoryAnalyticsRepository } from "../adapters/memory/analyticsRepository.js";

export type AnalyticsServices = {
  getDashboard: (
    context: ServiceContext,
    input: { period: AnalyticsPeriod },
  ) => Promise<AnalyticsDashboard>;
};

export function createAnalyticsServices(
  ports: AnalyticsServicePorts = {
    analyticsRepository: createMemoryAnalyticsRepository(),
  },
): AnalyticsServices {
  return {
    getDashboard: (context, input) =>
      getAnalyticsDashboard(context, ports, input),
  };
}

export const analyticsServices = createAnalyticsServices();
