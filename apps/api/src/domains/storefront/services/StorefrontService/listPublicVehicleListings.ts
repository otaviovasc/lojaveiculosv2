import { createServiceLogMetadata } from "../../../../shared/serviceContext.js";
import { assertPermission } from "../../../../shared/authorization.js";
import type { ServiceContext } from "../../../../shared/serviceContext.js";
import type {
  PublicStorefrontRepository,
  PublicStorefrontStore,
  PublicVehicleListing,
} from "../../ports/publicStorefrontRepository.js";
import {
  getPublicStorefrontRepository,
  PublicStorefrontNotFoundError,
} from "./serviceSupport.js";

const permission = "public_storefront.read";

export type ListPublicVehicleListingsInput = {
  limit: number;
  storeSlug: string;
};

export type PublicVehicleListingsResult = {
  listings: readonly PublicVehicleListing[];
  store: PublicStorefrontStore;
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
    storeId: store.id,
    tenantId: store.tenantId,
  });

  await context.audit.record({
    action: "public_storefront.listings.list",
    actor: context.actor,
    category: "data_access",
    entityId: store.id,
    entityType: "store",
    metadata: { listingCount: listings.length, permission },
    outcome: "succeeded",
    requestId: context.requestId,
    storeId: store.id,
    tenantId: store.tenantId,
    summary: "Listed public storefront vehicle listings",
  });

  return { listings, store };
}
