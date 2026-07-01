import type { InventoryListingServices } from "../../inventory/controllers/listingServices.js";
import type { toExternalVehicleListItem } from "./externalApiRuntime.dtos.js";
import type {
  ExternalCreateLeadInput,
  ExternalUpdateLeadInput,
  ExternalVehicleQuery,
} from "./externalApiRuntime.schemas.js";

export class ExternalRuntimeValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ExternalRuntimeValidationError";
  }
}

export function cleanCreateLeadInput(input: ExternalCreateLeadInput) {
  const metadata = cleanLeadMetadata(input);
  return {
    buyerEmail: input.buyerEmail ?? input.email ?? null,
    buyerName: input.buyerName ?? input.name ?? null,
    buyerPhone: input.buyerPhone ?? input.phone ?? null,
    listingId: input.listingId ?? input.vehicleId ?? null,
    ...(Object.keys(metadata).length > 0 ? { metadata } : {}),
    source: input.source,
  };
}

export function cleanUpdateLeadInput(input: ExternalUpdateLeadInput) {
  const metadata = cleanLeadMetadata(input);
  return {
    ...(input.buyerEmail !== undefined || input.email !== undefined
      ? { buyerEmail: input.buyerEmail ?? input.email ?? null }
      : {}),
    ...(input.buyerName !== undefined || input.name !== undefined
      ? { buyerName: input.buyerName ?? input.name ?? null }
      : {}),
    ...(input.buyerPhone !== undefined || input.phone !== undefined
      ? { buyerPhone: input.buyerPhone ?? input.phone ?? null }
      : {}),
    ...(Object.keys(metadata).length > 0 ? { metadata } : {}),
    ...(input.status ? { status: input.status } : {}),
  };
}

export function assertLeadHasBuyerSignal(input: ExternalCreateLeadInput) {
  if (input.buyerName ?? input.name ?? input.buyerPhone ?? input.phone) return;
  if (input.buyerEmail ?? input.email ?? input.message) return;
  throw new ExternalRuntimeValidationError(
    "Lead creation requires buyer name, phone, email, or message.",
  );
}

export function hasAdvancedVehicleFilters(query: ExternalVehicleQuery) {
  return Boolean(
    query.color ??
    query.cor ??
    query.fuel ??
    query.fuelType ??
    query.maxKm ??
    query.maxMileageKm ??
    query.maxPrice ??
    query.maxPriceCents ??
    query.maxYear ??
    query.minKm ??
    query.minMileageKm ??
    query.minPrice ??
    query.minPriceCents ??
    query.minYear ??
    query.transmission ??
    (query.sort !== "recent" ? query.sort : undefined),
  );
}

export function matchesVehicleFilters(
  item: ReturnType<typeof toExternalVehicleListItem>,
  query: ExternalVehicleQuery,
) {
  const minPrice = query.minPriceCents ?? toCents(query.minPrice) ?? null;
  const maxPrice = query.maxPriceCents ?? toCents(query.maxPrice) ?? null;
  const minKm = query.minMileageKm ?? query.minKm;
  const maxKm = query.maxMileageKm ?? query.maxKm;
  const year = item.years.model ?? item.years.manufacture;

  if (minPrice !== null && (item.priceCents ?? 0) < minPrice) return false;
  if (maxPrice !== null && (item.priceCents ?? 0) > maxPrice) return false;
  if (minKm !== undefined && (item.mileageKm ?? 0) < minKm) return false;
  if (maxKm !== undefined && (item.mileageKm ?? 0) > maxKm) return false;
  if (query.minYear !== undefined && (!year || year < query.minYear))
    return false;
  if (query.maxYear !== undefined && (!year || year > query.maxYear))
    return false;
  if (!matchesText(item.specs.fuelType, query.fuelType ?? query.fuel)) {
    return false;
  }
  if (!matchesText(item.specs.transmission, query.transmission)) return false;
  const color = query.color ?? query.cor;
  if (color && !item.colors.some((entry) => matchesText(entry.name, color))) {
    return false;
  }
  return true;
}

export function sortVehicles(
  items: ReturnType<typeof toExternalVehicleListItem>[],
  sort: ExternalVehicleQuery["sort"],
) {
  return [...items].sort((left, right) => {
    switch (sort) {
      case "km_asc":
        return nullableNumber(left.mileageKm) - nullableNumber(right.mileageKm);
      case "km_desc":
        return nullableNumber(right.mileageKm) - nullableNumber(left.mileageKm);
      case "price_asc":
        return (
          nullableNumber(left.priceCents) - nullableNumber(right.priceCents)
        );
      case "price_desc":
        return (
          nullableNumber(right.priceCents) - nullableNumber(left.priceCents)
        );
      case "year_asc":
        return vehicleYear(left) - vehicleYear(right);
      case "year_desc":
        return vehicleYear(right) - vehicleYear(left);
      case "highlight":
      case "recent":
      default:
        return (
          Date.parse(right.updatedAt ?? right.createdAt) -
          Date.parse(left.updatedAt ?? left.createdAt)
        );
    }
  });
}

export function resolveVehicleStatus(query: ExternalVehicleQuery) {
  if (query.status) return query.status;
  if (query.available === true) return "published" as const;
  return null;
}

export function createPagination(
  page: number,
  limit: number,
  offset: number,
  totalOrCount: number,
) {
  const hasMore = offset + limit < totalOrCount;
  return {
    hasMore,
    limit,
    nextOffset: hasMore ? offset + limit : null,
    page,
    total: totalOrCount,
  };
}

export function createPaginationFromResult(
  page: number,
  limit: number,
  result: Awaited<ReturnType<InventoryListingServices["listListings"]>>,
) {
  return {
    hasMore: result.hasMore,
    limit,
    nextOffset: result.nextOffset,
    page,
    total: result.total,
  };
}

function cleanLeadMetadata(input: {
  message?: string | null | undefined;
  metadata?: Record<string, unknown> | undefined;
  title?: string | null | undefined;
}) {
  return {
    ...(input.metadata ?? {}),
    ...(input.message ? { message: input.message } : {}),
    ...(input.title ? { title: input.title } : {}),
  };
}

function matchesText(value: string | null | undefined, expected?: string) {
  if (!expected) return true;
  return (value ?? "").toLowerCase().includes(expected.toLowerCase());
}

function nullableNumber(value: number | null | undefined) {
  return value ?? Number.MAX_SAFE_INTEGER;
}

function vehicleYear(item: ReturnType<typeof toExternalVehicleListItem>) {
  return item.years.model ?? item.years.manufacture ?? 0;
}

function toCents(value: number | undefined) {
  if (value === undefined) return null;
  return Math.round(value * 100);
}
