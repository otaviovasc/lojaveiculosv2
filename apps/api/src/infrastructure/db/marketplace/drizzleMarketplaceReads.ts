import { and, asc, eq, inArray, isNull } from "drizzle-orm";
import {
  vehicleListings,
  vehicleMedia,
  vehicleUnits,
} from "@lojaveiculosv2/db";
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

  const units = await db
    .select()
    .from(vehicleUnits)
    .where(
      and(
        eq(vehicleUnits.listingId, listing.id),
        eq(vehicleUnits.storeId, input.storeId),
        eq(vehicleUnits.tenantId, input.tenantId),
        eq(vehicleUnits.isDeleted, false),
        isNull(vehicleUnits.deletedAt),
      ),
    )
    .limit(100);
  const sortedUnits = [...units].sort((left, right) => {
    const statusDifference =
      unitStatusPriority(left.status) - unitStatusPriority(right.status);
    if (statusDifference !== 0) return statusDifference;
    const stockDifference = (left.stockNumber ?? "").localeCompare(
      right.stockNumber ?? "",
    );
    if (stockDifference !== 0) return stockDifference;
    return left.id.localeCompare(right.id);
  });
  const mediaRows = sortedUnits.length
    ? await db
        .select()
        .from(vehicleMedia)
        .where(
          and(
            inArray(
              vehicleMedia.unitId,
              sortedUnits.map((unit) => unit.id),
            ),
            eq(vehicleMedia.storeId, input.storeId),
            eq(vehicleMedia.tenantId, input.tenantId),
            eq(vehicleMedia.isPublic, true),
            eq(vehicleMedia.kind, "photo"),
            eq(vehicleMedia.isDeleted, false),
            isNull(vehicleMedia.deletedAt),
          ),
        )
        .orderBy(asc(vehicleMedia.displayOrder), asc(vehicleMedia.id))
    : [];
  const mediaByUnitId = new Map<string, typeof mediaRows>();
  for (const media of mediaRows) {
    mediaByUnitId.set(media.unitId, [
      ...(mediaByUnitId.get(media.unitId) ?? []),
      media,
    ]);
  }
  const selectedUnitId =
    sortedUnits.find((unit) => mediaByUnitId.has(unit.id))?.id ??
    sortedUnits[0]?.id;
  const mediaUrls = selectedUnitId
    ? (mediaByUnitId.get(selectedUnitId) ?? []).map((media) => media.url)
    : [];

  return {
    description: listing.description,
    listingId: listing.id,
    mediaUrls,
    modelYear: listing.modelYear,
    priceCents: listing.askingPriceCents,
    title: listing.title,
    vehicleType: null,
  };
}

type VehicleUnitStatus =
  | "acquired"
  | "available"
  | "delivered"
  | "inactive"
  | "in_preparation"
  | "reserved"
  | "sold";

function unitStatusPriority(status: VehicleUnitStatus) {
  const priority: Record<VehicleUnitStatus, number> = {
    available: 0,
    in_preparation: 1,
    acquired: 2,
    reserved: 3,
    sold: 4,
    delivered: 5,
    inactive: 6,
  };
  return priority[status] ?? 99;
}
