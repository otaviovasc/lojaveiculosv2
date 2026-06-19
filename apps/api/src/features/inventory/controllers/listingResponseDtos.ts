import type {
  VehicleListingDetail,
  VehicleListingListResult,
  VehicleListingSummary,
} from "../../../domains/vehicle/readModels/vehicleReadModels.js";

export type InventoryListingDetailResponse = ReturnType<typeof toDetailDto>;
export type InventoryListingListResponse = ReturnType<typeof toListDto>;

export function toDetailDto(detail: VehicleListingDetail) {
  return {
    costs: detail.costs.map((cost) => ({
      ...cost,
      costDate: cost.costDate.toISOString(),
      createdAt: cost.createdAt.toISOString(),
      updatedAt: cost.updatedAt.toISOString(),
    })),
    documents: detail.documents.map((document) => ({
      ...document,
      createdAt: document.createdAt.toISOString(),
      updatedAt: document.updatedAt.toISOString(),
      uploadedAt: document.uploadedAt.toISOString(),
    })),
    listing: {
      ...detail.listing,
      createdAt: detail.listing.createdAt.toISOString(),
      updatedAt: detail.listing.updatedAt.toISOString(),
    },
    media: detail.media.map((item) => ({
      ...item,
      createdAt: item.createdAt.toISOString(),
      updatedAt: item.updatedAt.toISOString(),
    })),
    priceHistory: detail.priceHistory.map((entry) => ({
      ...entry,
      changedAt: entry.changedAt.toISOString(),
      createdAt: entry.createdAt.toISOString(),
      updatedAt: entry.updatedAt.toISOString(),
    })),
    status: "ready" as const,
    statusHistory: detail.statusHistory.map((entry) => ({
      ...entry,
      changedAt: entry.changedAt.toISOString(),
      createdAt: entry.createdAt.toISOString(),
      updatedAt: entry.updatedAt.toISOString(),
    })),
    units: detail.units.map((unit) => ({
      ...unit,
      createdAt: unit.createdAt.toISOString(),
      updatedAt: unit.updatedAt.toISOString(),
    })),
  };
}

export function toListDto(result: VehicleListingListResult) {
  return {
    items: result.items.map(toSummaryDto),
    total: result.total,
  };
}

function toSummaryDto(summary: VehicleListingSummary) {
  return {
    listing: {
      ...summary.listing,
      createdAt: summary.listing.createdAt.toISOString(),
      updatedAt: summary.listing.updatedAt.toISOString(),
    },
    mediaCount: summary.mediaCount,
    primaryMediaUrl: summary.primaryMediaUrl,
    primaryUnit: summary.primaryUnit
      ? {
          ...summary.primaryUnit,
          createdAt: summary.primaryUnit.createdAt.toISOString(),
          updatedAt: summary.primaryUnit.updatedAt.toISOString(),
        }
      : null,
  };
}
