import type {
  VehicleListingDetail,
  VehicleListingListResult,
  VehicleListingSummary,
  VehicleUnitListResult,
  VehicleUnitSummary,
} from "../../../domains/vehicle/readModels/vehicleReadModels.js";

export type InventoryListingDetailResponse = ReturnType<typeof toDetailDto>;
export type InventoryListingListResponse = ReturnType<typeof toListDto>;
export type InventoryUnitListResponse = ReturnType<typeof toUnitListDto>;

export function toDetailDto(detail: VehicleListingDetail) {
  return {
    checklists: detail.checklists.map((checklist) => ({
      ...checklist,
      completedAt: checklist.completedAt?.toISOString() ?? null,
      createdAt: checklist.createdAt.toISOString(),
      updatedAt: checklist.updatedAt.toISOString(),
    })),
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
    listing: toListingDto(detail.listing),
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
    hasMore: result.hasMore,
    items: result.items.map(toSummaryDto),
    nextOffset: result.nextOffset,
    total: result.total,
  };
}

export function toUnitListDto(result: VehicleUnitListResult) {
  return {
    hasMore: result.hasMore,
    items: result.items.map(toUnitSummaryDto),
    nextOffset: result.nextOffset,
    total: result.total,
  };
}

function toSummaryDto(summary: VehicleListingSummary) {
  return {
    listing: toListingDto(summary.listing),
    mediaCount: summary.mediaCount,
    primaryPublicMediaUrl: summary.primaryPublicMediaUrl,
    primaryMediaUrl: summary.primaryMediaUrl,
    publicMediaCount: summary.publicMediaCount,
    primaryUnit: summary.primaryUnit
      ? {
          ...summary.primaryUnit,
          createdAt: summary.primaryUnit.createdAt.toISOString(),
          updatedAt: summary.primaryUnit.updatedAt.toISOString(),
        }
      : null,
    units: summary.units.map((unit) => ({
      ...unit,
      createdAt: unit.createdAt.toISOString(),
      updatedAt: unit.updatedAt.toISOString(),
    })),
  };
}

function toUnitSummaryDto(summary: VehicleUnitSummary) {
  return {
    listing: toListingDto(summary.listing),
    mediaCount: summary.mediaCount,
    primaryMediaUrl: summary.primaryMediaUrl,
    primaryUnit: {
      ...summary.unit,
      createdAt: summary.unit.createdAt.toISOString(),
      updatedAt: summary.unit.updatedAt.toISOString(),
    },
    unit: {
      ...summary.unit,
      createdAt: summary.unit.createdAt.toISOString(),
      updatedAt: summary.unit.updatedAt.toISOString(),
    },
    units: [
      {
        ...summary.unit,
        createdAt: summary.unit.createdAt.toISOString(),
        updatedAt: summary.unit.updatedAt.toISOString(),
      },
    ],
  };
}

function toListingDto(listing: VehicleListingDetail["listing"]) {
  return {
    ...listing,
    createdAt: listing.createdAt.toISOString(),
    resaleAnalysis: listing.resaleAnalysis
      ? {
          ...listing.resaleAnalysis,
          generatedAt: listing.resaleAnalysis.generatedAt.toISOString(),
        }
      : null,
    updatedAt: listing.updatedAt.toISOString(),
  };
}
