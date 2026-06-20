import type { ServiceContext } from "../../../shared/serviceContext.js";
import type { AnalyticsDashboard } from "../../../domains/analytics/ports/analyticsRepository.js";
import { getAnalyticsDashboard } from "../../../domains/analytics/services/AnalyticsService/getAnalyticsDashboard.js";
import type { AnalyticsServicePorts } from "../../../domains/analytics/services/AnalyticsService/serviceSupport.js";
import { createMemoryAnalyticsRepository } from "../adapters/memory/analyticsRepository.js";

export type AnalyticsServices = {
  getDashboard: (context: ServiceContext) => Promise<AnalyticsDashboard>;
};

export function createAnalyticsServices(
  ports: AnalyticsServicePorts = {
    analyticsRepository: createMemoryAnalyticsRepository(),
  },
): AnalyticsServices {
  return {
    getDashboard: (context) => getAnalyticsDashboard(context, ports),
  };
}

export const analyticsServices = createAnalyticsServices();
