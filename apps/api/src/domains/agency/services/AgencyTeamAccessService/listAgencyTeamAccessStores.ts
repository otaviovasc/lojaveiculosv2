import { assertPermission } from "../../../../shared/authorization.js";
import {
  createServiceLogMetadata,
  type ServiceContext,
} from "../../../../shared/serviceContext.js";
import {
  requireAgencyTeamAccessScope,
  type AgencyTeamAccessServicePorts,
} from "./serviceSupport.js";

const permission = "users.manage";

export async function listAgencyTeamAccessStores(
  context: ServiceContext,
  ports: AgencyTeamAccessServicePorts,
) {
  assertPermission(context, permission);
  const scope = requireAgencyTeamAccessScope(context);

  context.logger.info(
    "agency.team_access.stores.list.started",
    createServiceLogMetadata(context),
  );

  const stores = await ports.storeDirectory.listStores(scope);

  await context.audit.record({
    action: "agency.team_access.stores.list",
    actor: context.actor,
    category: "data_access",
    entityId: scope.tenantId,
    entityType: "tenant",
    metadata: { permission, storeCount: stores.length },
    outcome: "succeeded",
    requestId: context.requestId,
    storeId: null,
    summary: "Listed stores available for agency team access",
    tenantId: scope.tenantId,
  });

  return { stores, tenantId: scope.tenantId };
}
