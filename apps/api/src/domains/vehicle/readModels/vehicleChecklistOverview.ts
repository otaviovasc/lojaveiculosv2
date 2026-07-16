import type { VehicleChecklist } from "../ports/vehicleChecklistRepository.js";
import type {
  VehicleListingStatus,
  VehicleUnitStatus,
} from "../ports/vehicleInventoryRepository.js";

export const vehicleChecklistOverviewScopes = [
  "active",
  "completed",
  "all",
] as const;
export const vehicleChecklistOverviewStatuses = [
  "all",
  "attention",
  "missing",
  "failed",
  "in_progress",
  "passed",
  "pending",
  "waived",
] as const;

export type VehicleChecklistOverviewScope =
  (typeof vehicleChecklistOverviewScopes)[number];
export type VehicleChecklistOverviewFilter =
  (typeof vehicleChecklistOverviewStatuses)[number];
export type VehicleChecklistOverviewStatus = Exclude<
  VehicleChecklistOverviewFilter,
  "all" | "attention"
>;

export type VehicleChecklistOverviewMetrics = {
  checklistCount: number;
  failedItemCount: number;
  itemCount: number;
  pendingItemCount: number;
  progressPercent: number;
  resolvedItemCount: number;
  waivedItemCount: number;
};

export type VehicleChecklistOverviewItem = {
  checklists: readonly VehicleChecklist[];
  listing: {
    id: string;
    manufactureYear: number | null;
    modelYear: number | null;
    status: VehicleListingStatus;
    title: string;
  };
  metrics: VehicleChecklistOverviewMetrics;
  status: VehicleChecklistOverviewStatus;
  unit: {
    colorName: string | null;
    id: string;
    plate: string | null;
    status: VehicleUnitStatus;
    stockNumber: string | null;
    vin: string | null;
  };
  updatedAt: Date;
};

export type VehicleChecklistOverview = {
  generatedAt: Date;
  items: readonly VehicleChecklistOverviewItem[];
  summary: VehicleChecklistOverviewMetrics & {
    attentionUnitCount: number;
    missingChecklistUnitCount: number;
    unitCount: number;
  };
};
