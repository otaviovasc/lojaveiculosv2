import { createServiceLogMetadata } from "../../../../shared/serviceContext.js";
import { assertPermission } from "../../../../shared/authorization.js";
import type { ServiceContext } from "../../../../shared/serviceContext.js";
import type {
  PublicStorefrontRepository,
  PublicStorefrontStoreSummary,
  PublicVehicleListing,
} from "../../ports/publicStorefrontRepository.js";
import {
  getPublicStorefrontRepository,
  PublicStorefrontNotFoundError,
} from "./serviceSupport.js";

const permission = "public_storefront.read";

export type ListPublicVehicleListingsInput = {
  limit: number;
  offset?: number;
  storeSlug: string;
};

export type PublicVehicleListingsResult = {
  listings: readonly PublicVehicleListing[];
  store: PublicStorefrontStoreSummary;
};

export async function listPublicVehicleListings(
  context: ServiceContext,
  input: ListPublicVehicleListingsInput,
  repository?: PublicStorefrontRepository,
): Promise<PublicVehicleListingsResult> {
  assertPermission(context, permission);
  const storefrontRepository = getPublicStorefrontRepository(repository);

  context.logger.info(
    "public_storefront.listings.started",
    createServiceLogMetadata(context, {
      limit: input.limit,
      offset: input.offset ?? 0,
      storeSlug: input.storeSlug,
    }),
  );

  const store = await storefrontRepository.findPublicStoreBySlug(
    input.storeSlug,
  );

  if (!store) {
    throw new PublicStorefrontNotFoundError(input.storeSlug);
  }

  const listings = await storefrontRepository.listPublicListings({
    limit: input.limit,
    offset: input.offset ?? 0,
    storeId: store.id,
    tenantId: store.tenantId,
  });

  await context.audit.record({
    action: "public_storefront.listings.list",
    actor: context.actor,
    category: "data_access",
    entityId: store.id,
    entityType: "store",
    metadata: {
      limit: input.limit,
      listingCount: listings.length,
      offset: input.offset ?? 0,
      permission,
    },
    outcome: "succeeded",
    requestId: context.requestId,
    storeId: store.id,
    tenantId: store.tenantId,
    summary: "Listed public storefront vehicle listings",
  });

  return { listings, store: { name: store.name, slug: store.slug } };
}
