import type { FindVehicleListingInput } from "./vehicleInventoryRepository.js";

export const vehicleChecklistStatuses = [
  "failed",
  "in_progress",
  "passed",
  "pending",
  "waived",
] as const;

export const vehicleChecklistItemStatuses = [
  "failed",
  "passed",
  "pending",
  "waived",
] as const;

export type VehicleChecklistStatus = (typeof vehicleChecklistStatuses)[number];
export type VehicleChecklistItemStatus =
  (typeof vehicleChecklistItemStatuses)[number];

export type VehicleChecklistItem = {
  id: string;
  label: string;
  notes: string | null;
  status: VehicleChecklistItemStatus;
};

export type VehicleChecklist = {
  completedAt: Date | null;
  completedByUserId: string | null;
  createdAt: Date;
  id: string;
  items: readonly VehicleChecklistItem[];
  name: string;
  status: VehicleChecklistStatus;
  storeId: string | null;
  tenantId: string | null;
  unitId: string;
  updatedAt: Date;
};

export type CreateVehicleChecklistRecord = Omit<
  VehicleChecklist,
  "createdAt" | "id" | "updatedAt"
>;

export type FindVehicleChecklistInput = FindVehicleListingInput & {
  checklistId: string;
  unitId: string;
};

export type ListVehicleChecklistsInput = {
  storeId: string | null;
  tenantId: string | null;
  unitIds: readonly string[];
};

export type VehicleChecklistRepository = {
  create: (record: CreateVehicleChecklistRecord) => Promise<VehicleChecklist>;
  findById: (
    input: FindVehicleChecklistInput,
  ) => Promise<VehicleChecklist | null>;
  listByUnitIds: (
    input: ListVehicleChecklistsInput,
  ) => Promise<readonly VehicleChecklist[]>;
  save: (checklist: VehicleChecklist) => Promise<VehicleChecklist>;
};
