import { assertPermission } from "../../../../shared/authorization.js";
import {
  createServiceLogMetadata,
  type ServiceContext,
} from "../../../../shared/serviceContext.js";
import type {
  MarketplaceListingProjection,
  MarketplaceProvider,
} from "../../ports/marketplaceRepository.js";
import { isProviderRelevant } from "./marketplaceStockPlanRules.js";
import type {
  MarketplaceStockPlan,
  MarketplaceStockPlanItem,
} from "./marketplaceStockPlanTypes.js";
import {
  requireMarketplaceScope,
  type MarketplaceServicePorts,
} from "./serviceSupport.js";
import {
  assertMarketplaceAccountPreflightResultReady,
  checkMarketplaceAccountPreflight,
  isMarketplaceAccountPreflightReady,
  readMarketplaceAccountToken,
} from "./marketplaceAccountPreflight.js";
import { createCatalogMappingResolver } from "../marketplaceCatalogResolution.js";
import {
  pendingMarketplaceStockItem,
  readMarketplaceListingId,
  removedListingProjection,
} from "../marketplaceListingReconciliation.js";
import { summarizeMarketplaceStockPlan } from "./summarizeMarketplaceStockPlan.js";
import { planMarketplaceStockItem } from "./planMarketplaceStockItem.js";

export { listListingBlockers } from "./marketplaceStockPlanRules.js";
export { planMarketplaceStockItem } from "./planMarketplaceStockItem.js";
export { summarizeMarketplaceStockPlan } from "./summarizeMarketplaceStockPlan.js";
export type {
  MarketplaceListingBlocker,
  MarketplaceListingBlockerCode,
  MarketplaceStockPlan,
  MarketplaceStockPlanDecision,
  MarketplaceStockPlanItem,
} from "./marketplaceStockPlanTypes.js";

export type PlanMarketplaceStockSyncInput = {
  allowAccountDiagnostics?: boolean;
  listingIds?: readonly string[];
  provider: MarketplaceProvider;
};

export async function planMarketplaceStockSync(
  context: ServiceContext,
  input: PlanMarketplaceStockSyncInput,
  ports: MarketplaceServicePorts,
): Promise<MarketplaceStockPlan> {
  assertPermission(context, "marketplace.inventory_sync");
  const scope = requireMarketplaceScope(context);

  context.logger.info(
    "marketplace.stock_sync.preview.started",
    createServiceLogMetadata(context, {
      listingCount: input.listingIds?.length ?? null,
      provider: input.provider,
    }),
  );

  const account = await ports.marketplaceRepository.findAccount({
    provider: input.provider,
    storeId: scope.storeId as never,
    tenantId: scope.tenantId as never,
  });
  const accountPreflight = await checkMarketplaceAccountPreflight({
    account,
    ...(ports.gatewayRegistry
      ? { gatewayRegistry: ports.gatewayRegistry }
      : {}),
    provider: input.provider,
  });
  const connectionReady = isMarketplaceAccountPreflightReady(accountPreflight);
  if (!input.allowAccountDiagnostics) {
    assertMarketplaceAccountPreflightResultReady(
      accountPreflight,
      input.provider,
    );
  }
  const gateway = ports.gatewayRegistry?.getGateway(input.provider);
  const mappingToken =
    account && connectionReady && gateway?.resolveCatalogMapping
      ? readMarketplaceAccountToken(account, input.provider)
      : null;
  const resolveCatalogMapping = createCatalogMappingResolver({
    gateway,
    ports,
    provider: input.provider,
    token: mappingToken,
  });
  const listingsInput = {
    ...(input.listingIds ? { listingIds: input.listingIds } : {}),
    storeId: scope.storeId as never,
    tenantId: scope.tenantId as never,
  };
  const listings =
    await ports.marketplaceRepository.listListingProjections(listingsInput);
  const providerListings = account
    ? await ports.marketplaceRepository.listProviderListings({
        accountId: account.id,
        ...(input.listingIds ? { listingIds: input.listingIds } : {}),
        storeId: scope.storeId as never,
        tenantId: scope.tenantId as never,
      })
    : [];
  const activeJobs = await ports.marketplaceRepository.listActiveSyncJobs({
    ...(input.listingIds ? { listingIds: input.listingIds } : {}),
    provider: input.provider,
    storeId: scope.storeId as never,
    tenantId: scope.tenantId as never,
  });
  const activeJobsByListingId = new Map(
    activeJobs.flatMap((job) => {
      const listingId = readMarketplaceListingId(job.metadata.listingId);
      return listingId ? [[listingId, job] as const] : [];
    }),
  );
  const providerListingsByListingId = new Map(
    providerListings.map((item) => [item.listingId, item]),
  );
  const candidatesByListingId = new Map<
    string,
    {
      listing: MarketplaceListingProjection;
      origin: "provider_only" | "stock";
    }
  >(
    providerListings.map((item) => [
      item.listingId,
      {
        listing: removedListingProjection(item.listingId),
        origin: "provider_only" as const,
      },
    ]),
  );
  for (const listing of listings) {
    candidatesByListingId.set(listing.listingId, {
      listing,
      origin: "stock",
    });
  }
  const candidates = [...candidatesByListingId.values()];

  const items = await Promise.all(
    candidates.map(async ({ listing, origin }) => {
      const providerListing =
        providerListingsByListingId.get(listing.listingId) ?? null;
      if (activeJobsByListingId.has(listing.listingId)) {
        return pendingMarketplaceStockItem(
          listing,
          providerListing,
          input.provider,
          origin,
        );
      }
      const catalogMapping = isProviderRelevant(listing)
        ? await resolveCatalogMapping(listing.catalog)
        : null;
      return planMarketplaceStockItem({
        catalogMapping,
        connectionReady,
        listing,
        origin,
        provider: input.provider,
        providerListing,
      });
    }),
  );
  const plan = summarizeMarketplaceStockPlan(items);

  await context.audit.record({
    action: "marketplace.stock_sync.preview",
    actor: context.actor,
    category: "data_access",
    entityId: scope.storeId,
    entityType: "marketplace_stock_sync",
    metadata: {
      blocked: plan.blocked,
      listingCount: plan.total,
      pending: plan.pending,
      permission: "marketplace.inventory_sync",
      provider: input.provider,
      publish: plan.publish,
      unpublish: plan.unpublish,
      update: plan.update,
    },
    outcome: "succeeded",
    requestId: context.requestId,
    storeId: scope.storeId,
    tenantId: scope.tenantId,
    summary: "Previewed marketplace stock sync plan",
  });

  return plan;
}
