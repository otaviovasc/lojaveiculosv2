import type {
  InternalHealthSnapshot,
  InternalMonitoringRepository,
} from "../../../../domains/internal/ports/internalMonitoringRepository.js";

export function createMemoryInternalMonitoringRepository(): InternalMonitoringRepository {
  return {
    async getHealthSnapshot(): Promise<InternalHealthSnapshot> {
      return {
        events: [],
        failures: [],
        generatedAt: new Date(),
        summary: {
          criticalEvents: 0,
          failedEvents: 0,
          openSinkFailures: 0,
          recentEvents: 0,
        },
      };
    },
  };
}
