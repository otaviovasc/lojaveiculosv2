import type {
  InventoryListingDetailResponse,
  InventoryListingListResponse,
} from "../../inventory/controllers/listingResponseDtos.js";
import type { CrmLead } from "../../../domains/crm/ports/crmRepository.js";

type ListingSummary = InventoryListingListResponse["items"][number];
type ListingDetail = InventoryListingDetailResponse;

export function toExternalVehicleListItem(
  item: ListingSummary,
  publicPriceCents: number | null = null,
) {
  const listing = item.listing;
  const units = publicUnits(item.units);

  return {
    availability: {
      availableUnits: units.filter((unit) => unit.status === "available")
        .length,
      reservedUnits: units.filter((unit) => unit.status === "reserved").length,
      unitCount: units.length,
    },
    catalog: toCatalog(listing.catalog),
    colors: toColors(units),
    createdAt: listing.createdAt,
    description: listing.description,
    id: listing.id,
    media: {
      count: item.publicMediaCount,
      primaryImageUrl: item.primaryPublicMediaUrl,
    },
    mileageKm: listing.mileageKm,
    object: "vehicle",
    priceCents: publicPriceCents,
    specs: toSpecs(listing),
    status: listing.status,
    title: listing.title,
    trimName: listing.trimName,
    updatedAt: listing.updatedAt,
    years: {
      manufacture: listing.manufactureYear,
      model: listing.modelYear ?? listing.catalog?.modelYear ?? null,
    },
  } as const;
}

export function toExternalVehicleDetail(
  detail: ListingDetail,
  publicPriceCents: number | null = null,
) {
  const listing = detail.listing;
  const publicMedia = orderedPublicMedia(detail);

  return {
    ...toExternalVehicleListItem({
      leadsCount: 0,
      listing,
      mediaCount: detail.media.length,
      primaryPublicMediaUrl: publicMedia[0]?.url ?? null,
      primaryMediaUrl: publicMedia[0]?.url ?? null,
      primaryUnit: detail.units[0] ?? null,
      publicMediaCount: publicMedia.length,
      units: publicUnits(detail.units),
    }),
    media: publicMedia.map((item) => ({
      altText: item.altText,
      id: item.id,
      kind: item.kind,
      order: item.displayOrder,
      url: item.url,
    })),
    priceHistory:
      publicPriceCents === null
        ? []
        : detail.priceHistory.map((entry) => ({
            changedAt: entry.changedAt,
            newPriceCents: entry.newPriceCents,
            oldPriceCents: entry.oldPriceCents,
          })),
    statusHistory: detail.statusHistory.map((entry) => ({
      changedAt: entry.changedAt,
      fromStatus: entry.fromStatus,
      toStatus: entry.toStatus,
    })),
    units: publicUnits(detail.units).map((unit) => ({
      colorName: unit.colorName,
      status: unit.status,
    })),
  } as const;
}

export function toExternalLead(lead: CrmLead) {
  return {
    buyer: {
      email: lead.buyerEmail,
      name: lead.buyerName,
      phone: lead.buyerPhone,
    },
    createdAt: lead.createdAt.toISOString(),
    id: lead.id,
    lastInteractionAt: lead.lastInteractionAt?.toISOString() ?? null,
    listingId: lead.listingId,
    metadata: publicLeadMetadata(lead.metadata),
    object: "lead",
    source: lead.source,
    status: lead.status,
    updatedAt: lead.updatedAt.toISOString(),
    vehicleTitle: lead.vehicleTitle,
  } as const;
}

function orderedPublicMedia(detail: ListingDetail) {
  return [...detail.media]
    .filter((item) => item.isPublic)
    .sort((left, right) => left.displayOrder - right.displayOrder);
}

function toCatalog(listingCatalog: ListingSummary["listing"]["catalog"]) {
  if (!listingCatalog) return null;
  return {
    brand: {
      code: listingCatalog.brandCode,
      logoUrl: listingCatalog.brandLogoUrl ?? null,
      name: listingCatalog.brandName,
    },
    fipeCode: listingCatalog.fipeCode,
    fuel: listingCatalog.fuel,
    model: {
      code: listingCatalog.modelCode,
      name: listingCatalog.modelName,
    },
    referenceMonth: listingCatalog.referenceMonth,
    source: listingCatalog.source,
    vehicleType: listingCatalog.vehicleType,
    yearCode: listingCatalog.yearCode,
    yearName: listingCatalog.yearName,
  } as const;
}

function toColors(units: ListingSummary["units"]) {
  const counts = new Map<string, number>();
  for (const unit of units) {
    if (!unit.colorName) continue;
    counts.set(unit.colorName, (counts.get(unit.colorName) ?? 0) + 1);
  }
  return [...counts.entries()].map(([name, quantity]) => ({ name, quantity }));
}

function publicUnits(units: ListingSummary["units"]) {
  return units.filter(
    (unit) => unit.status === "available" || unit.status === "reserved",
  );
}

function publicLeadMetadata(metadata: Record<string, unknown>) {
  return {
    ...(typeof metadata.message === "string"
      ? { message: metadata.message }
      : {}),
    ...(typeof metadata.title === "string" ? { title: metadata.title } : {}),
  };
}

function toSpecs(listing: ListingSummary["listing"]) {
  return {
    doors: listing.doors,
    engineAspiration: listing.engineAspiration,
    engineDisplacement: listing.engineDisplacement,
    fuelType: listing.fuelType,
    transmission: listing.transmission,
  } as const;
}
