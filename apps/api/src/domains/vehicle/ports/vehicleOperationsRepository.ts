import type { FindVehicleListingInput } from "./vehicleInventoryRepository.js";

export type VehicleCostKind =
  | "acquisition"
  | "fee"
  | "other"
  | "preparation"
  | "repair"
  | "tax"
  | "transport";

export type VehicleCost = {
  amountCents: number;
  costDate: Date;
  createdAt: Date;
  description: string | null;
  id: string;
  kind: VehicleCostKind;
  storeId: string | null;
  tenantId: string | null;
  unitId: string;
  updatedAt: Date;
};

export type VehiclePriceHistoryEntry = {
  actorUserId: string | null;
  changedAt: Date;
  createdAt: Date;
  id: string;
  listingId: string;
  newPriceCents: number | null;
  oldPriceCents: number | null;
  reason: string | null;
  storeId: string | null;
  tenantId: string | null;
  updatedAt: Date;
};

export type VehicleStatusHistoryEntry = {
  actorUserId: string | null;
  changedAt: Date;
  createdAt: Date;
  fromStatus: string | null;
  id: string;
  listingId: string | null;
  reason: string | null;
  storeId: string | null;
  target: "listing" | "unit";
  tenantId: string | null;
  toStatus: string;
  unitId: string | null;
  updatedAt: Date;
};

export type CreateVehicleCostRecord = Omit<
  VehicleCost,
  "createdAt" | "id" | "updatedAt"
>;

export type CreateVehiclePriceHistoryRecord = Omit<
  VehiclePriceHistoryEntry,
  "changedAt" | "createdAt" | "id" | "updatedAt"
>;

export type CreateVehicleStatusHistoryRecord = Omit<
  VehicleStatusHistoryEntry,
  "changedAt" | "createdAt" | "id" | "updatedAt"
>;

export type ListVehicleCostsInput = {
  storeId: string | null;
  tenantId: string | null;
  unitIds: readonly string[];
};

export type VehicleOperationsRepository = {
  createCost: (record: CreateVehicleCostRecord) => Promise<VehicleCost>;
  createPriceHistory: (
    record: CreateVehiclePriceHistoryRecord,
  ) => Promise<VehiclePriceHistoryEntry>;
  createStatusHistory: (
    record: CreateVehicleStatusHistoryRecord,
  ) => Promise<VehicleStatusHistoryEntry>;
  listCostsByUnitIds: (
    input: ListVehicleCostsInput,
  ) => Promise<readonly VehicleCost[]>;
  listPriceHistoryByListing: (
    input: FindVehicleListingInput,
  ) => Promise<readonly VehiclePriceHistoryEntry[]>;
  listStatusHistoryByListing: (
    input: FindVehicleListingInput,
  ) => Promise<readonly VehicleStatusHistoryEntry[]>;
};
