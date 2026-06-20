import type { ServiceContext } from "../../../shared/serviceContext.js";
import type { ComplianceSnapshot } from "../../../domains/compliance/ports/complianceRepository.js";
import { getComplianceSnapshot } from "../../../domains/compliance/services/ComplianceService/getComplianceSnapshot.js";
import type { ComplianceServicePorts } from "../../../domains/compliance/services/ComplianceService/serviceSupport.js";
import { createMemoryComplianceRepository } from "../adapters/memory/complianceRepository.js";

export type ComplianceServices = {
  getSnapshot: (context: ServiceContext) => Promise<ComplianceSnapshot>;
};

export function createComplianceServices(
  ports: ComplianceServicePorts = {
    complianceRepository: createMemoryComplianceRepository(),
  },
): ComplianceServices {
  return {
    getSnapshot: (context) => getComplianceSnapshot(context, ports),
  };
}

export const complianceServices = createComplianceServices();
