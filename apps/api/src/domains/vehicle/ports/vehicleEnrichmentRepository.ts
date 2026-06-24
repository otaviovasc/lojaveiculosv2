import type { InventoryPlateLookupResponse } from "./vehicleEnrichmentTypes.js";

export type VehiclePlateLookupProvider = "apibrasil";

export type VehiclePlateLookupRecord = {
  fetchedAt: Date;
  id: string;
  plate: string;
  provider: VehiclePlateLookupProvider;
  response: InventoryPlateLookupResponse;
  storeId: string | null;
  tenantId: string | null;
};

export type FindVehiclePlateLookupInput = {
  minFetchedAt?: Date | undefined;
  plate: string;
  provider: VehiclePlateLookupProvider;
  storeId: string | null;
  tenantId: string | null;
};

export type UpsertVehiclePlateLookupInput = {
  fetchedAt: Date;
  plate: string;
  provider: VehiclePlateLookupProvider;
  response: InventoryPlateLookupResponse;
  storeId: string | null;
  tenantId: string | null;
};

export type VehiclePlateLookupRepository = {
  findLatest: (
    input: FindVehiclePlateLookupInput,
  ) => Promise<VehiclePlateLookupRecord | null>;
  upsert: (
    input: UpsertVehiclePlateLookupInput,
  ) => Promise<VehiclePlateLookupRecord>;
};
