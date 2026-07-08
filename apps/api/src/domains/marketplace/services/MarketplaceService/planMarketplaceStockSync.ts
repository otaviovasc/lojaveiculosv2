import { assertPermission } from "../../../../shared/authorization.js";
import {
  createServiceLogMetadata,
  type ServiceContext,
} from "../../../../shared/serviceContext.js";
import type {
  MarketplaceCatalogMapping,
  MarketplaceCatalogSnapshot,
  MarketplaceListingProjection,
  MarketplaceProvider,
  MarketplaceProviderListing,
} from "../../ports/marketplaceRepository.js";
import {
  isCompleteCatalog,
  isProviderRelevant,
  listListingBlockers,
  shouldUnpublish,
} from "./marketplaceStockPlanRules.js";
import type {
  MarketplaceStockPlan,
  MarketplaceStockPlanDecision,
  MarketplaceStockPlanItem,
} from "./marketplaceStockPlanTypes.js";
import {
  requireMarketplaceScope,
  type MarketplaceServicePorts,
} from "./serviceSupport.js";
import { assertMarketplaceAccountPreflightReady } from "./marketplaceAccountPreflight.js";

export { listListingBlockers } from "./marketplaceStockPlanRules.js";
export type {
  MarketplaceListingBlocker,
  MarketplaceListingBlockerCode,
  MarketplaceStockPlan,
  MarketplaceStockPlanDecision,
  MarketplaceStockPlanItem,
} from "./marketplaceStockPlanTypes.js";

export type PlanMarketplaceStockSyncInput = {
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
  await assertMarketplaceAccountPreflightReady({
    account,
    ...(ports.gatewayRegistry
      ? { gatewayRegistry: ports.gatewayRegistry }
      : {}),
    provider: input.provider,
  });
  const listingsInput = {
    ...(input.listingIds ? { listingIds: input.listingIds } : {}),
    storeId: scope.storeId as never,
    tenantId: scope.tenantId as never,
  };
  const listings =
    await ports.marketplaceRepository.listListingProjections(listingsInput);

  const items = await Promise.all(
    listings.map(async (listing) => {
      const [providerListing, catalogMapping] = await Promise.all([
        account
          ? ports.marketplaceRepository.findProviderListing({
              accountId: account.id,
              listingId: listing.listingId,
              storeId: scope.storeId as never,
              tenantId: scope.tenantId as never,
            })
          : Promise.resolve(null),
        findMappingIfPossible(ports, input.provider, listing.catalog),
      ]);
      return planMarketplaceStockItem({
        catalogMapping,
        listing,
        provider: input.provider,
        providerListing,
      });
    }),
  );
  const plan = summarizePlan(items);

  await context.audit.record({
    action: "marketplace.stock_sync.preview",
    actor: context.actor,
    category: "data_access",
    entityId: scope.storeId,
    entityType: "marketplace_stock_sync",
    metadata: {
      blocked: plan.blocked,
      listingCount: listings.length,
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

export function planMarketplaceStockItem(input: {
  catalogMapping: MarketplaceCatalogMapping | null;
  listing: MarketplaceListingProjection;
  provider: MarketplaceProvider;
  providerListing: MarketplaceProviderListing | null;
}): MarketplaceStockPlanItem {
  const externalId = input.providerListing?.externalId ?? null;
  if (!isProviderRelevant(input.listing) && !externalId) {
    return {
      blockers: [],
      decision: "no_op",
      externalId,
      jobType: null,
      listing: input.listing,
      provider: input.provider,
    };
  }
  if (shouldUnpublish(input.listing)) {
    return {
      blockers: [],
      decision: externalId ? "unpublish" : "no_op",
      externalId,
      jobType: externalId ? "listing_unpublish" : null,
      listing: input.listing,
      provider: input.provider,
    };
  }

  const blockers = listListingBlockers(input.listing, input.catalogMapping);
  if (blockers.length) {
    return {
      blockers,
      decision: externalId ? "blocked" : "blocked",
      externalId,
      jobType: null,
      listing: input.listing,
      provider: input.provider,
    };
  }

  return {
    blockers: [],
    decision: externalId ? "update" : "publish",
    externalId,
    jobType: externalId ? "listing_update" : "listing_publish",
    listing: input.listing,
    provider: input.provider,
  };
}

function summarizePlan(
  items: readonly MarketplaceStockPlanItem[],
): MarketplaceStockPlan {
  return {
    blocked: count(items, "blocked"),
    items: [...items],
    noOp: count(items, "no_op"),
    publish: count(items, "publish"),
    total: items.length,
    unpublish: count(items, "unpublish"),
    update: count(items, "update"),
  };
}

async function findMappingIfPossible(
  ports: MarketplaceServicePorts,
  provider: MarketplaceProvider,
  catalog: MarketplaceCatalogSnapshot | null,
) {
  if (!catalog || catalog.source !== "fipe" || !isCompleteCatalog(catalog)) {
    return null;
  }
  return ports.marketplaceRepository.findCatalogMapping({ catalog, provider });
}

function count(
  items: readonly MarketplaceStockPlanItem[],
  decision: MarketplaceStockPlanDecision,
) {
  return items.filter((item) => item.decision === decision).length;
}
