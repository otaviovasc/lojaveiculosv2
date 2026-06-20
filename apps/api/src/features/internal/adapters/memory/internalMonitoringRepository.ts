import type {
  InternalHealthSnapshot,
  InternalMonitoringRepository,
} from "../../../../domains/internal/ports/internalMonitoringRepository.js";

export function createMemoryInternalMonitoringRepository(): InternalMonitoringRepository {
  return {
    async getHealthSnapshot(): Promise<InternalHealthSnapshot> {
      return {
        actionMetrics: [],
        actorMetrics: [],
        alerts: [],
        categoryMetrics: [],
        events: [],
        failures: [],
        generatedAt: new Date(),
        outcomeMetrics: [],
        severityMetrics: [],
        sinkMetrics: [],
        status: "healthy",
        summary: {
          criticalEvents: 0,
          deniedEvents: 0,
          failedEvents: 0,
          openSinkFailures: 0,
          recentEvents: 0,
          uniqueActors: 0,
          warningEvents: 0,
        },
      };
    },
  };
}
