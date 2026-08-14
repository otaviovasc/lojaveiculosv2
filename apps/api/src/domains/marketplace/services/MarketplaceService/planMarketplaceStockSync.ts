import { assertPermission } from "../../../../shared/authorization.js";
import {
  createServiceLogMetadata,
  type ServiceContext,
} from "../../../../shared/serviceContext.js";
import type {
  MarketplaceCatalogMapping,
  MarketplaceListingProjection,
  MarketplaceProvider,
  MarketplaceProviderListing,
} from "../../ports/marketplaceRepository.js";
import {
  isProviderRelevant,
  listListingBlockers,
  shouldUnpublish,
} from "./marketplaceStockPlanRules.js";
import type {
  MarketplaceStockPlan,
  MarketplaceStockPlanItem,
} from "./marketplaceStockPlanTypes.js";
import {
  requireMarketplaceScope,
  type MarketplaceServicePorts,
} from "./serviceSupport.js";
import { assertMarketplaceAccountPreflightReady } from "./marketplaceAccountPreflight.js";
import { readMarketplaceAccountToken } from "./marketplaceAccountPreflight.js";
import {
  createCatalogMappingResolver,
  providerMapping,
} from "../marketplaceCatalogResolution.js";
import {
  pendingMarketplaceStockItem,
  readMarketplaceListingId,
  removedListingProjection,
} from "../marketplaceListingReconciliation.js";
import { summarizeMarketplaceStockPlan } from "./summarizeMarketplaceStockPlan.js";

export { listListingBlockers } from "./marketplaceStockPlanRules.js";
export { summarizeMarketplaceStockPlan } from "./summarizeMarketplaceStockPlan.js";
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
  const gateway = ports.gatewayRegistry?.getGateway(input.provider);
  const mappingToken =
    account && gateway?.resolveCatalogMapping
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
  const localListingIds = new Set(listings.map((item) => item.listingId));
  const candidates = [
    ...listings,
    ...providerListings
      .filter((item) => !localListingIds.has(item.listingId))
      .map((item) => removedListingProjection(item.listingId)),
  ];

  const items = await Promise.all(
    candidates.map(async (listing) => {
      const providerListing =
        providerListingsByListingId.get(listing.listingId) ?? null;
      if (activeJobsByListingId.has(listing.listingId)) {
        return pendingMarketplaceStockItem(
          listing,
          providerListing,
          input.provider,
        );
      }
      const catalogMapping = isProviderRelevant(listing)
        ? await resolveCatalogMapping(listing.catalog)
        : null;
      return planMarketplaceStockItem({
        catalogMapping,
        listing,
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
      providerMapping: null,
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
      providerMapping: null,
    };
  }

  const blockers = listListingBlockers(
    input.listing,
    input.catalogMapping,
    input.provider,
  );
  if (blockers.length) {
    return {
      blockers,
      decision: externalId ? "blocked" : "blocked",
      externalId,
      jobType: null,
      listing: input.listing,
      provider: input.provider,
      providerMapping: providerMapping(input.catalogMapping, input.provider),
    };
  }

  return {
    blockers: [],
    decision: externalId ? "update" : "publish",
    externalId,
    jobType: externalId ? "listing_update" : "listing_publish",
    listing: input.listing,
    provider: input.provider,
    providerMapping: providerMapping(input.catalogMapping, input.provider),
  };
}
