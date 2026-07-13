import type {
  CreateVehicleDocumentRecord,
  CreateVehicleListingRecord,
  CreateVehicleMediaRecord,
  CreateVehicleUnitRecord,
  FindVehicleListingByPublicSlugInput,
  FindVehicleListingInput,
  FindVehicleMediaInput,
  FindVehicleUnitInput,
  ListVehicleChildrenInput,
  ListVehicleDocumentsInput,
  ListVehicleListingsInput,
  ListVehicleUnitChildrenInput,
  ListVehicleUnitsInput,
} from "./vehicleInventoryInputs.js";
import type {
  VehicleDocument,
  VehicleListing,
  VehicleMedia,
  VehicleUnit,
} from "./vehicleInventoryTypes.js";

export type * from "./vehicleInventoryInputs.js";
export type * from "./vehicleInventoryTypes.js";

export type VehicleListingRepository = {
  create: (record: CreateVehicleListingRecord) => Promise<VehicleListing>;
  delete: (listing: VehicleListing) => Promise<VehicleListing>;
  findById: (input: FindVehicleListingInput) => Promise<VehicleListing | null>;
  findByPublicSlug: (
    input: FindVehicleListingByPublicSlugInput,
  ) => Promise<VehicleListing | null>;
  list: (input: ListVehicleListingsInput) => Promise<readonly VehicleListing[]>;
  lockForStockTransition: (
    input: FindVehicleListingInput,
  ) => Promise<VehicleListing | null>;
  save: (listing: VehicleListing) => Promise<VehicleListing>;
};

export type VehicleUnitRepository = {
  create: (record: CreateVehicleUnitRecord) => Promise<VehicleUnit>;
  delete: (unit: VehicleUnit) => Promise<VehicleUnit>;
  findById: (input: FindVehicleUnitInput) => Promise<VehicleUnit | null>;
  listByListingIds: (
    input: ListVehicleChildrenInput,
  ) => Promise<readonly VehicleUnit[]>;
  list: (input: ListVehicleUnitsInput) => Promise<readonly VehicleUnit[]>;
  save: (unit: VehicleUnit) => Promise<VehicleUnit>;
  saveIfStatus: (
    unit: VehicleUnit,
    expectedStatus: VehicleUnit["status"],
  ) => Promise<VehicleUnit | null>;
};

export type VehicleMediaRepository = {
  create: (record: CreateVehicleMediaRecord) => Promise<VehicleMedia>;
  delete: (media: VehicleMedia) => Promise<VehicleMedia>;
  findById: (input: FindVehicleMediaInput) => Promise<VehicleMedia | null>;
  listByListingIds: (
    input: ListVehicleChildrenInput,
  ) => Promise<readonly VehicleMedia[]>;
  listByUnitIds: (
    input: ListVehicleUnitChildrenInput,
  ) => Promise<readonly VehicleMedia[]>;
  save: (media: VehicleMedia) => Promise<VehicleMedia>;
};

export type VoidVehicleDocumentsBySaleInput = {
  actorId: string;
  at: Date;
  reason: string;
  saleId: string;
  storeId: string | null;
  tenantId: string | null;
  unitId: string;
};

export type VehicleDocumentRepository = {
  create: (record: CreateVehicleDocumentRecord) => Promise<VehicleDocument>;
  listByListing: (
    input: ListVehicleDocumentsInput,
  ) => Promise<readonly VehicleDocument[]>;
  voidBySale: (
    input: VoidVehicleDocumentsBySaleInput,
  ) => Promise<readonly VehicleDocument[]>;
};
