import type { ServiceContext } from "../../../shared/serviceContext.js";
import type {
  AnalyticsDashboard,
  AnalyticsPeriod,
  HomeDashboard,
} from "../../../domains/analytics/ports/analyticsRepository.js";
import { getAnalyticsDashboard } from "../../../domains/analytics/services/AnalyticsService/getAnalyticsDashboard.js";
import { getHomeDashboard } from "../../../domains/analytics/services/AnalyticsService/getHomeDashboard.js";
import type { AnalyticsServicePorts } from "../../../domains/analytics/services/AnalyticsService/serviceSupport.js";
import { createMemoryAnalyticsRepository } from "../adapters/memory/analyticsRepository.js";

export type AnalyticsServices = {
  getHomeDashboard: (
    context: ServiceContext,
    input: { period: AnalyticsPeriod },
  ) => Promise<HomeDashboard>;
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
    getHomeDashboard: (context, input) =>
      getHomeDashboard(context, ports, input),
    getDashboard: (context, input) =>
      getAnalyticsDashboard(context, ports, input),
  };
}

export const analyticsServices = createAnalyticsServices();
