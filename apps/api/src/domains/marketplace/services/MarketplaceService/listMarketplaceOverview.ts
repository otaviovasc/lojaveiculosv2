import {
  createServiceLogMetadata,
  type ServiceContext,
} from "../../../../shared/serviceContext.js";
import { assertPermission } from "../../../../shared/authorization.js";
import type { MarketplaceOverview } from "../../ports/marketplaceRepository.js";
import {
  requireMarketplaceScope,
  type MarketplaceServicePorts,
} from "./serviceSupport.js";

export async function listMarketplaceOverview(
  context: ServiceContext,
  ports: MarketplaceServicePorts,
): Promise<MarketplaceOverview> {
  assertPermission(context, "marketplace.read");
  const scope = requireMarketplaceScope(context);

  context.logger.info(
    "marketplace.overview.read.started",
    createServiceLogMetadata(context),
  );

  const overview = await ports.marketplaceRepository.listOverview({
    storeId: scope.storeId as never,
    tenantId: scope.tenantId as never,
  });

  await context.audit.record({
    action: "marketplace.overview.read",
    actor: context.actor,
    category: "data_access",
    entityId: scope.storeId,
    entityType: "marketplace",
    metadata: {
      accountCount: overview.accounts.length,
      jobCount: overview.jobs.length,
      permission: "marketplace.read",
    },
    outcome: "succeeded",
    requestId: context.requestId,
    storeId: scope.storeId,
    tenantId: scope.tenantId,
    summary: "Read marketplace integration overview",
  });

  return overview;
}
