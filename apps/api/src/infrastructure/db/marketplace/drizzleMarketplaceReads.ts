import { and, asc, eq, inArray, isNull } from "drizzle-orm";
import {
  storeProfiles,
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
        eq(vehicleListings.isDeleted, false),
        isNull(vehicleListings.deletedAt),
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
        inArray(vehicleUnits.status, marketplaceEligibleUnitStatuses),
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
  const selectedUnit = selectedUnitId
    ? sortedUnits.find((unit) => unit.id === selectedUnitId)
    : null;
  const mediaUrls = selectedUnitId
    ? (mediaByUnitId.get(selectedUnitId) ?? []).map((media) => media.url)
    : [];
  const selectedMedia = selectedUnitId
    ? (mediaByUnitId.get(selectedUnitId) ?? []).map((media) => ({
        altText: media.altText,
        url: media.url,
      }))
    : [];

  const catalog = catalogSnapshot(listing.metadata);
  const [storeProfile] = await db
    .select({
      addressZipCode: storeProfiles.addressZipCode,
      contactPhone: storeProfiles.contactPhone,
      whatsappPhone: storeProfiles.whatsappPhone,
    })
    .from(storeProfiles)
    .where(
      and(
        eq(storeProfiles.storeId, input.storeId),
        eq(storeProfiles.tenantId, input.tenantId),
      ),
    )
    .limit(1);

  return {
    catalog,
    condition: listing.condition,
    contactPhone:
      storeProfile?.whatsappPhone ?? storeProfile?.contactPhone ?? null,
    description: listing.description,
    doors: listing.doors,
    fuelType: listing.fuelType,
    isVisibleOnPublicSite: listing.isVisibleOnPublicSite,
    licensePlate:
      selectedUnit?.plate ??
      sortedUnits.find((unit) => Boolean(unit.plate))?.plate ??
      null,
    listingId: listing.id,
    locationZipCode: storeProfile?.addressZipCode ?? null,
    mediaUrls,
    mileageKm: listing.mileageKm,
    modelYear: listing.modelYear,
    priceCents: listing.askingPriceCents,
    publicSlug: listing.publicSlug,
    selectedMedia,
    selectedUnitId: selectedUnitId ?? null,
    status: listing.status,
    stockLabel: selectedUnit?.stockNumber ?? null,
    title: listing.title,
    trimName: listing.trimName,
    vehicleType: catalog?.vehicleType ?? null,
  };
}

export async function listListingProjections(
  db: DrizzleMarketplaceClient,
  input: { listingIds?: readonly string[]; storeId: string; tenantId: string },
): Promise<MarketplaceListingProjection[]> {
  const rows = await db
    .select({ id: vehicleListings.id })
    .from(vehicleListings)
    .where(
      and(
        eq(vehicleListings.storeId, input.storeId),
        eq(vehicleListings.tenantId, input.tenantId),
        eq(vehicleListings.isDeleted, false),
        isNull(vehicleListings.deletedAt),
        ...(input.listingIds?.length
          ? [inArray(vehicleListings.id, [...input.listingIds])]
          : []),
      ),
    )
    .limit(500);
  const projections = await Promise.all(
    rows.map((row) =>
      findListingProjection(db, {
        listingId: row.id,
        storeId: input.storeId,
        tenantId: input.tenantId,
      }),
    ),
  );
  return projections.filter((item): item is MarketplaceListingProjection =>
    Boolean(item),
  );
}

function catalogSnapshot(
  metadata: unknown,
): MarketplaceListingProjection["catalog"] {
  const catalog = readObject(readObject(metadata).catalog);
  if (!catalog) return null;
  return {
    brandCode: readString(catalog.brandCode),
    brandName: readString(catalog.brandName),
    fipeCode: readString(catalog.fipeCode),
    fuel: readString(catalog.fuel),
    modelCode: readString(catalog.modelCode),
    modelName: readString(catalog.modelName),
    modelYear: readNumber(catalog.modelYear),
    referenceMonth: readString(catalog.referenceMonth),
    source: readString(catalog.source) === "fipe" ? "fipe" : null,
    vehicleType: readVehicleType(catalog.vehicleType),
    yearCode: readString(catalog.yearCode),
    yearName: readString(catalog.yearName),
  };
}

function readObject(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function readNumber(value: unknown): number | null {
  return typeof value === "number" ? value : null;
}

function readString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function readVehicleType(
  value: unknown,
): MarketplaceListingProjection["vehicleType"] {
  return value === "cars" || value === "motorcycles" || value === "trucks"
    ? value
    : null;
}

const marketplaceEligibleUnitStatuses = [
  "acquired",
  "available",
  "in_preparation",
] as const;

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
