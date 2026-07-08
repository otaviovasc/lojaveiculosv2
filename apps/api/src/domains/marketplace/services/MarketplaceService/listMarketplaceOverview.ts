import {
  createServiceLogMetadata,
  type ServiceContext,
} from "../../../../shared/serviceContext.js";
import { assertPermission } from "../../../../shared/authorization.js";
import type { MarketplaceOverview } from "../../ports/marketplaceRepository.js";
import { checkMarketplaceAccountPreflight } from "./marketplaceAccountPreflight.js";
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
  const providerStates = await Promise.all(
    overview.providerStates.map(async (state) => {
      const account =
        overview.accounts.find((item) => item.provider === state.provider) ??
        null;
      const preflight = await checkMarketplaceAccountPreflight({
        account,
        ...(ports.gatewayRegistry
          ? { gatewayRegistry: ports.gatewayRegistry }
          : {}),
        provider: state.provider,
      });
      return {
        ...state,
        connectionStatus: preflight.status,
        requirements: preflight.requirements,
      };
    }),
  );
  const enrichedOverview = { ...overview, providerStates };

  await context.audit.record({
    action: "marketplace.overview.read",
    actor: context.actor,
    category: "data_access",
    entityId: scope.storeId,
    entityType: "marketplace",
    metadata: {
      accountCount: enrichedOverview.accounts.length,
      jobCount: enrichedOverview.jobs.length,
      permission: "marketplace.read",
    },
    outcome: "succeeded",
    requestId: context.requestId,
    storeId: scope.storeId,
    tenantId: scope.tenantId,
    summary: "Read marketplace integration overview",
  });

  return enrichedOverview;
}
