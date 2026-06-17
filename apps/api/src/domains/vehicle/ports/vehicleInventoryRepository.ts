export type VehicleListingStatus =
  | "draft"
  | "available"
  | "reserved"
  | "sold"
  | "inactive";

export type VehicleUnitStatus = "available" | "reserved" | "sold" | "retired";

export type VehicleListing = {
  createdAt: Date;
  description: string | null;
  id: string;
  plate: string | null;
  priceCents: number | null;
  status: VehicleListingStatus;
  storeId: string | null;
  tenantId: string | null;
  title: string;
  unitIds: readonly string[];
  updatedAt: Date;
};

export type VehicleUnit = {
  createdAt: Date;
  id: string;
  listingId: string;
  plate: string | null;
  status: VehicleUnitStatus;
  stockNumber: string | null;
  storeId: string | null;
  tenantId: string | null;
  vin: string | null;
};

export type CreateVehicleListingRecord = {
  description: string | null;
  plate: string | null;
  priceCents: number | null;
  status: VehicleListingStatus;
  storeId: string | null;
  tenantId: string | null;
  title: string;
};

export type CreateVehicleUnitRecord = {
  listingId: string;
  plate: string | null;
  status: VehicleUnitStatus;
  stockNumber: string | null;
  storeId: string | null;
  tenantId: string | null;
  vin: string | null;
};

export type FindVehicleListingInput = {
  listingId: string;
  storeId: string | null;
  tenantId: string | null;
};

export type VehicleListingRepository = {
  create: (record: CreateVehicleListingRecord) => Promise<VehicleListing>;
  findById: (input: FindVehicleListingInput) => Promise<VehicleListing | null>;
  save: (listing: VehicleListing) => Promise<VehicleListing>;
};

export type VehicleUnitRepository = {
  create: (record: CreateVehicleUnitRecord) => Promise<VehicleUnit>;
};
