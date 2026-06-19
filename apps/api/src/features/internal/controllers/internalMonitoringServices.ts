import type { ServiceContext } from "../../../shared/serviceContext.js";
import type { InternalHealthSnapshot } from "../../../domains/internal/ports/internalMonitoringRepository.js";
import { getInternalHealthSnapshot } from "../../../domains/internal/services/InternalMonitoringService/getInternalHealthSnapshot.js";
import type { InternalMonitoringServicePorts } from "../../../domains/internal/services/InternalMonitoringService/serviceSupport.js";
import {
  createDrizzleInternalMonitoringRepository,
  type DrizzleInternalMonitoringClient,
} from "../../../infrastructure/db/internal/drizzleInternalMonitoringRepository.js";
import { createMemoryInternalMonitoringRepository } from "../adapters/memory/internalMonitoringRepository.js";

export type InternalMonitoringServices = {
  getHealth: (
    context: ServiceContext,
    input: { limit: number },
  ) => Promise<InternalHealthSnapshot>;
};

export type CreateInternalMonitoringServicesOptions =
  | { auditDrizzleClient?: never; ports?: InternalMonitoringServicePorts }
  | { auditDrizzleClient: DrizzleInternalMonitoringClient; ports?: never };

export function createInternalMonitoringServices(
  options: CreateInternalMonitoringServicesOptions = {},
): InternalMonitoringServices {
  const ports = resolvePorts(options);

  return {
    getHealth: (context, input) =>
      getInternalHealthSnapshot(context, input, ports),
  };
}

function resolvePorts(
  options: CreateInternalMonitoringServicesOptions,
): InternalMonitoringServicePorts {
  if ("ports" in options && options.ports) return options.ports;
  if ("auditDrizzleClient" in options) {
    return {
      internalMonitoringRepository: createDrizzleInternalMonitoringRepository(
        options.auditDrizzleClient,
      ),
    };
  }

  return {
    internalMonitoringRepository: createMemoryInternalMonitoringRepository(),
  };
}

export const internalMonitoringServices = createInternalMonitoringServices();
