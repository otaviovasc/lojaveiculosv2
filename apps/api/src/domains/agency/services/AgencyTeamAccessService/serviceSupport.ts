import type { TenantId, UserId } from "@lojaveiculosv2/shared";
import type { ServiceContext } from "../../../../shared/serviceContext.js";
import type { AgencyTeamAccessStoreDirectory } from "../../ports/agencyTeamAccessRepository.js";

export type AgencyTeamAccessServicePorts = {
  storeDirectory: AgencyTeamAccessStoreDirectory;
};

export function requireAgencyTeamAccessScope(context: ServiceContext) {
  if (context.actor.kind !== "user") {
    throw new AgencyTeamAccessScopeError(
      "Agency team access requires authenticated user context.",
    );
  }
  if (!context.tenantId || context.storeId) {
    throw new AgencyTeamAccessScopeError(
      "Agency team access requires tenant scope without a store scope.",
    );
  }
  return {
    tenantId: context.tenantId as TenantId,
    userId: context.actor.id as UserId,
  };
}

export class AgencyTeamAccessScopeError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AgencyTeamAccessScopeError";
  }
}
