import type {
  InventoryChecklist,
  InventoryListingStatus,
  InventoryUnitStatus,
} from "./types";

export type InventoryChecklistOverviewScope = "active" | "completed" | "all";
export type InventoryChecklistOverviewFilter =
  | "all"
  | "attention"
  | "missing"
  | "failed"
  | "in_progress"
  | "passed"
  | "pending"
  | "waived";
export type InventoryChecklistOverviewStatus = Exclude<
  InventoryChecklistOverviewFilter,
  "all" | "attention"
>;

export type InventoryChecklistOverviewMetrics = {
  checklistCount: number;
  failedItemCount: number;
  itemCount: number;
  pendingItemCount: number;
  progressPercent: number;
  resolvedItemCount: number;
  waivedItemCount: number;
};

export type InventoryChecklistOverviewItem = {
  checklists: readonly InventoryChecklist[];
  listing: {
    id: string;
    manufactureYear: number | null;
    modelYear: number | null;
    status: InventoryListingStatus;
    title: string;
  };
  metrics: InventoryChecklistOverviewMetrics;
  status: InventoryChecklistOverviewStatus;
  unit: {
    colorName: string | null;
    id: string;
    plate: string | null;
    status: InventoryUnitStatus;
    stockNumber: string | null;
    vin: string | null;
  };
  updatedAt: string;
};

export type InventoryChecklistOverview = {
  generatedAt: string;
  items: readonly InventoryChecklistOverviewItem[];
  summary: InventoryChecklistOverviewMetrics & {
    attentionUnitCount: number;
    missingChecklistUnitCount: number;
    unitCount: number;
  };
};

export type InventoryChecklistOverviewInput = {
  scope?: InventoryChecklistOverviewScope;
  search?: string;
  status?: InventoryChecklistOverviewFilter;
  unitId?: string;
};

export type InventoryChecklistPdf = {
  blob: Blob;
  fileName: string;
};
