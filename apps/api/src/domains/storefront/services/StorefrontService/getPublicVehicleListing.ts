import { assertPermission } from "../../../../shared/authorization.js";
import {
  createServiceLogMetadata,
  type ServiceContext,
} from "../../../../shared/serviceContext.js";
import type {
  PublicStorefrontRepository,
  PublicStorefrontStore,
  PublicVehicleListingDetail,
} from "../../ports/publicStorefrontRepository.js";
import {
  getPublicStorefrontRepository,
  PublicStorefrontListingNotFoundError,
  PublicStorefrontNotFoundError,
} from "./serviceSupport.js";

const permission = "public_storefront.read";

export type GetPublicVehicleListingInput = {
  listingSlug: string;
  storeSlug: string;
};

export type PublicVehicleListingDetailResult = {
  listing: PublicVehicleListingDetail;
  store: PublicStorefrontStore;
};

export async function getPublicVehicleListing(
  context: ServiceContext,
  input: GetPublicVehicleListingInput,
  repository?: PublicStorefrontRepository,
): Promise<PublicVehicleListingDetailResult> {
  assertPermission(context, permission);
  const storefrontRepository = getPublicStorefrontRepository(repository);

  context.logger.info(
    "public_storefront.listing.get.started",
    createServiceLogMetadata(context, {
      listingSlug: input.listingSlug,
      storeSlug: input.storeSlug,
    }),
  );

  const store = await storefrontRepository.findPublicStoreBySlug(
    input.storeSlug,
  );

  if (!store) throw new PublicStorefrontNotFoundError(input.storeSlug);

  const listing = await storefrontRepository.findPublicListingDetail({
    listingSlug: input.listingSlug,
    storeId: store.id,
    tenantId: store.tenantId,
  });

  if (!listing) {
    throw new PublicStorefrontListingNotFoundError(input.listingSlug);
  }

  await context.audit.record({
    action: "public_storefront.listing.get",
    actor: context.actor,
    category: "data_access",
    entityId: listing.listingId,
    entityType: "vehicle_listing",
    metadata: {
      mediaCount: listing.media.length,
      permission,
      storeSlug: input.storeSlug,
    },
    outcome: "succeeded",
    requestId: context.requestId,
    storeId: store.id,
    tenantId: store.tenantId,
    summary: "Read public storefront vehicle listing detail",
  });

  return { listing, store };
}
