import { and, eq } from "drizzle-orm";
import { vehicleListings, vehicleMedia } from "@lojaveiculosv2/db";
import type { MarketplaceListingProjection } from "../../../domains/marketplace/ports/marketplaceRepository.js";
import type { DrizzleMarketplaceClient } from "./drizzleMarketplaceRepository.js";

export async function findListingProjection(
  db: DrizzleMarketplaceClient,
  input: { listingId: string; storeId: string; tenantId: string },
): Promise<MarketplaceListingProjection | null> {
  const [listing] = await db
    .select()
    .from(vehicleListings)
    .where(
      and(
        eq(vehicleListings.id, input.listingId),
        eq(vehicleListings.storeId, input.storeId),
        eq(vehicleListings.tenantId, input.tenantId),
      ),
    )
    .limit(1);
  if (!listing) return null;

  const mediaRows = await db
    .select()
    .from(vehicleMedia)
    .where(
      and(
        eq(vehicleMedia.listingId, listing.id),
        eq(vehicleMedia.isPublic, true),
        eq(vehicleMedia.kind, "photo"),
      ),
    )
    .limit(20);

  return {
    description: listing.description,
    listingId: listing.id,
    mediaUrls: mediaRows
      .sort((left, right) => left.displayOrder - right.displayOrder)
      .map((media) => media.url),
    modelYear: listing.modelYear,
    priceCents: listing.askingPriceCents,
    title: listing.title,
    vehicleType: null,
  };
}
