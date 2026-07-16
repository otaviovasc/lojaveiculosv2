import type { VehicleChecklist } from "../ports/vehicleChecklistRepository.js";
import type {
  VehicleListing,
  VehicleUnit,
} from "../ports/vehicleInventoryRepository.js";
import type {
  VehicleChecklistOverview,
  VehicleChecklistOverviewFilter,
  VehicleChecklistOverviewItem,
  VehicleChecklistOverviewMetrics,
  VehicleChecklistOverviewStatus,
} from "../readModels/vehicleChecklistOverview.js";

export function createOverviewItem(
  listing: VehicleListing,
  unit: VehicleUnit,
  checklists: readonly VehicleChecklist[],
): VehicleChecklistOverviewItem {
  const metrics = calculateMetrics(checklists);
  return {
    checklists,
    listing: {
      id: listing.id,
      manufactureYear: listing.manufactureYear,
      modelYear: listing.modelYear,
      status: listing.status,
      title: listing.title,
    },
    metrics,
    status: resolveOverviewStatus(checklists),
    unit: {
      colorName: unit.colorName,
      id: unit.id,
      plate: unit.plate,
      status: unit.status,
      stockNumber: unit.stockNumber,
      vin: unit.vin,
    },
    updatedAt: latestUpdatedAt(unit, checklists),
  };
}

export function summarizeOverview(
  items: readonly VehicleChecklistOverviewItem[],
): VehicleChecklistOverview["summary"] {
  const totals = items.reduce(
    (summary, item) => ({
      checklistCount: summary.checklistCount + item.metrics.checklistCount,
      failedItemCount: summary.failedItemCount + item.metrics.failedItemCount,
      itemCount: summary.itemCount + item.metrics.itemCount,
      pendingItemCount:
        summary.pendingItemCount + item.metrics.pendingItemCount,
      resolvedItemCount:
        summary.resolvedItemCount + item.metrics.resolvedItemCount,
      waivedItemCount: summary.waivedItemCount + item.metrics.waivedItemCount,
    }),
    {
      checklistCount: 0,
      failedItemCount: 0,
      itemCount: 0,
      pendingItemCount: 0,
      resolvedItemCount: 0,
      waivedItemCount: 0,
    },
  );
  return {
    ...totals,
    attentionUnitCount: items.filter(
      (item) => item.status === "failed" || item.status === "missing",
    ).length,
    missingChecklistUnitCount: items.filter((item) => item.status === "missing")
      .length,
    progressPercent: totals.itemCount
      ? Math.round((totals.resolvedItemCount / totals.itemCount) * 100)
      : 0,
    unitCount: items.length,
  };
}

export function overviewStatusMatches(
  status: VehicleChecklistOverviewStatus,
  filter: VehicleChecklistOverviewFilter,
) {
  if (filter === "all") return true;
  if (filter === "attention")
    return status === "failed" || status === "missing";
  return status === filter;
}

export function compareOverviewItems(
  left: VehicleChecklistOverviewItem,
  right: VehicleChecklistOverviewItem,
) {
  const priority: Record<VehicleChecklistOverviewStatus, number> = {
    failed: 0,
    missing: 1,
    in_progress: 2,
    pending: 3,
    waived: 4,
    passed: 5,
  };
  return (
    priority[left.status] - priority[right.status] ||
    left.listing.title.localeCompare(right.listing.title, "pt-BR")
  );
}

function calculateMetrics(
  checklists: readonly VehicleChecklist[],
): VehicleChecklistOverviewMetrics {
  const items = checklists.flatMap((checklist) => checklist.items);
  const resolvedItemCount = items.filter(
    (item) => item.status === "passed" || item.status === "waived",
  ).length;
  return {
    checklistCount: checklists.length,
    failedItemCount: items.filter((item) => item.status === "failed").length,
    itemCount: items.length,
    pendingItemCount: items.filter((item) => item.status === "pending").length,
    progressPercent: items.length
      ? Math.round((resolvedItemCount / items.length) * 100)
      : 0,
    resolvedItemCount,
    waivedItemCount: items.filter((item) => item.status === "waived").length,
  };
}

function resolveOverviewStatus(
  checklists: readonly VehicleChecklist[],
): VehicleChecklistOverviewStatus {
  if (checklists.length === 0) return "missing";
  if (checklists.some((checklist) => checklist.status === "failed")) {
    return "failed";
  }
  if (checklists.every((checklist) => checklist.status === "waived")) {
    return "waived";
  }
  if (
    checklists.every(
      (checklist) =>
        checklist.status === "passed" || checklist.status === "waived",
    )
  ) {
    return "passed";
  }
  if (checklists.some((checklist) => checklist.status === "in_progress")) {
    return "in_progress";
  }
  if (checklists.some((checklist) => checklist.status !== "pending")) {
    return "in_progress";
  }
  return "pending";
}

function latestUpdatedAt(
  unit: VehicleUnit,
  checklists: readonly VehicleChecklist[],
) {
  return checklists.reduce(
    (latest, checklist) =>
      checklist.updatedAt > latest ? checklist.updatedAt : latest,
    unit.updatedAt,
  );
}
