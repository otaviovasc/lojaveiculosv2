import type {
  VehicleListing,
  VehicleDocument,
  VehicleMedia,
  VehicleUnit,
} from "../ports/vehicleInventoryRepository.js";
import type {
  VehicleCost,
  VehiclePriceHistoryEntry,
  VehicleStatusHistoryEntry,
} from "../ports/vehicleOperationsRepository.js";
import type { VehicleChecklist } from "../ports/vehicleChecklistRepository.js";

export type VehicleListingDetail = {
  checklists: readonly VehicleChecklist[];
  costs: readonly VehicleCost[];
  documents: readonly VehicleDocument[];
  listing: VehicleListing;
  media: readonly VehicleMedia[];
  priceHistory: readonly VehiclePriceHistoryEntry[];
  statusHistory: readonly VehicleStatusHistoryEntry[];
  units: readonly VehicleUnit[];
};

export type VehicleListingSummary = {
  listing: VehicleListing;
  mediaCount: number;
  primaryMediaUrl: string | null;
  primaryUnit: VehicleUnit | null;
  units: readonly VehicleUnit[];
};

export type VehicleListingListResult = {
  hasMore: boolean;
  items: readonly VehicleListingSummary[];
  nextOffset: number | null;
  total: number;
};

export type VehicleUnitSummary = {
  listing: VehicleListing;
  mediaCount: number;
  primaryMediaUrl: string | null;
  unit: VehicleUnit;
};

export type VehicleUnitListResult = {
  hasMore: boolean;
  items: readonly VehicleUnitSummary[];
  nextOffset: number | null;
  total: number;
};

export function createListingDetail(input: {
  checklists?: readonly VehicleChecklist[];
  documents?: readonly VehicleDocument[];
  costs?: readonly VehicleCost[];
  listing: VehicleListing;
  media: readonly VehicleMedia[];
  priceHistory?: readonly VehiclePriceHistoryEntry[];
  statusHistory?: readonly VehicleStatusHistoryEntry[];
  units: readonly VehicleUnit[];
}): VehicleListingDetail {
  return {
    checklists: input.checklists ?? [],
    costs: input.costs ?? [],
    documents: input.documents ?? [],
    listing: input.listing,
    media: input.media,
    priceHistory: input.priceHistory ?? [],
    statusHistory: input.statusHistory ?? [],
    units: input.units,
  };
}

export function createListingSummary(input: {
  listing: VehicleListing;
  media: readonly VehicleMedia[];
  units: readonly VehicleUnit[];
}): VehicleListingSummary {
  const orderedMedia = [...input.media].sort(
    (left, right) => left.displayOrder - right.displayOrder,
  );

  return {
    listing: input.listing,
    mediaCount: input.media.length,
    primaryMediaUrl: orderedMedia[0]?.url ?? null,
    primaryUnit: input.units[0] ?? null,
    units: input.units,
  };
}

export function createUnitSummary(input: {
  listing: VehicleListing;
  media: readonly VehicleMedia[];
  unit: VehicleUnit;
}): VehicleUnitSummary {
  const unitMedia = input.media.filter((item) => item.unitId === input.unit.id);
  const orderedMedia = [...unitMedia].sort(
    (left, right) => left.displayOrder - right.displayOrder,
  );

  return {
    listing: input.listing,
    mediaCount: unitMedia.length,
    primaryMediaUrl: orderedMedia[0]?.url ?? null,
    unit: input.unit,
  };
}
