import type { ServiceContext } from "../../../../shared/serviceContext.js";
import type { AgencyStatsRepository } from "../../ports/agencyStatsRepository.js";

export type AgencyStatsServicePorts = {
  agencyStatsRepository: AgencyStatsRepository;
};

export function requireAgencyStatsScope(context: ServiceContext) {
  if (!context.tenantId || context.storeId) {
    throw new AgencyStatsScopeError();
  }
  return { tenantId: context.tenantId };
}

export class AgencyStatsScopeError extends Error {
  constructor() {
    super("Agency statistics require tenant scope without a store scope.");
    this.name = "AgencyStatsScopeError";
  }
}
