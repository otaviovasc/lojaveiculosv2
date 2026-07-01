import type {
  InventoryListingDetailResponse,
  InventoryListingListResponse,
} from "../../inventory/controllers/listingResponseDtos.js";
import type { CrmLead } from "../../../domains/crm/ports/crmRepository.js";

type ListingSummary = InventoryListingListResponse["items"][number];
type ListingDetail = InventoryListingDetailResponse;

export function toExternalVehicleListItem(item: ListingSummary) {
  const listing = item.listing;
  const units = item.units;

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
    priceCents: listing.priceCents,
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

export function toExternalVehicleDetail(detail: ListingDetail) {
  const listing = detail.listing;
  const publicMedia = orderedPublicMedia(detail);

  return {
    ...toExternalVehicleListItem({
      listing,
      mediaCount: detail.media.length,
      primaryPublicMediaUrl: publicMedia[0]?.url ?? null,
      primaryMediaUrl: publicMedia[0]?.url ?? null,
      primaryUnit: detail.units[0] ?? null,
      publicMediaCount: publicMedia.length,
      units: detail.units,
    }),
    media: publicMedia.map((item) => ({
      altText: item.altText,
      id: item.id,
      kind: item.kind,
      order: item.displayOrder,
      url: item.url,
    })),
    priceHistory: detail.priceHistory.map((entry) => ({
      changedAt: entry.changedAt,
      newPriceCents: entry.newPriceCents,
      oldPriceCents: entry.oldPriceCents,
      reason: entry.reason,
    })),
    statusHistory: detail.statusHistory.map((entry) => ({
      changedAt: entry.changedAt,
      fromStatus: entry.fromStatus,
      reason: entry.reason,
      toStatus: entry.toStatus,
    })),
    units: detail.units.map((unit) => ({
      colorName: unit.colorName,
      id: unit.id,
      status: unit.status,
      stockNumber: unit.stockNumber,
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
    metadata: lead.metadata,
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

function toSpecs(listing: ListingSummary["listing"]) {
  return {
    doors: listing.doors,
    engineAspiration: listing.engineAspiration,
    engineDisplacement: listing.engineDisplacement,
    fuelType: listing.fuelType,
    transmission: listing.transmission,
  } as const;
}
