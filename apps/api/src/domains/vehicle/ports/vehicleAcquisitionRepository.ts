export const vehicleSupplierKinds = [
  "lead",
  "person",
  "company",
  "provider",
  "partner",
  "auction",
  "other",
] as const;

export const vehicleAcquisitionChannels = [
  "trade_in_lead",
  "direct_person",
  "supplier_company",
  "auto_avaliar",
  "repasse_partner",
  "auction",
  "consignment",
  "marketplace",
  "other",
] as const;

export const vehicleAcquisitionCommissionTimings = [
  "acquisition",
  "reserve",
  "closed",
] as const;

export type VehicleSupplierKind = (typeof vehicleSupplierKinds)[number];
export type VehicleAcquisitionChannel =
  (typeof vehicleAcquisitionChannels)[number];
export type VehicleAcquisitionCommissionTiming =
  (typeof vehicleAcquisitionCommissionTimings)[number];

export type VehicleSupplier = {
  createdAt: Date;
  displayName: string;
  documentNumber: string | null;
  email: string | null;
  externalProviderId: string | null;
  id: string;
  kind: VehicleSupplierKind;
  metadata: Record<string, unknown>;
  phone: string | null;
  provider: string | null;
  storeId: string | null;
  tenantId: string | null;
  updatedAt: Date;
};

export type VehicleUnitAcquisition = {
  acquisitionDate: Date | null;
  acquisitionPriceCents: number | null;
  acquisitionUserId: string | null;
  channel: VehicleAcquisitionChannel;
  commissionTiming: VehicleAcquisitionCommissionTiming;
  createdAt: Date;
  customChannelLabel: string | null;
  id: string;
  leadId: string | null;
  metadata: Record<string, unknown>;
  notes: string | null;
  sourceSnapshot: Record<string, unknown>;
  storeId: string | null;
  supplierId: string | null;
  tenantId: string | null;
  unitId: string;
  updatedAt: Date;
};

export type VehicleAcquisitionScope = {
  storeId: string | null;
  tenantId: string | null;
};

export type CreateVehicleSupplierRecord = Omit<
  VehicleSupplier,
  "createdAt" | "id" | "updatedAt"
>;

export type UpdateVehicleSupplierRecord = Partial<
  Omit<CreateVehicleSupplierRecord, "storeId" | "tenantId">
>;

export type UpsertVehicleUnitAcquisitionRecord = Omit<
  VehicleUnitAcquisition,
  "createdAt" | "id" | "storeId" | "tenantId" | "updatedAt"
>;

export type VehicleAcquisitionRepository = {
  archiveSupplier: (
    input: VehicleAcquisitionScope & { supplierId: string },
  ) => Promise<VehicleSupplier | null>;
  createSupplier: (
    record: CreateVehicleSupplierRecord,
  ) => Promise<VehicleSupplier>;
  findSupplierById: (
    input: VehicleAcquisitionScope & { supplierId: string },
  ) => Promise<VehicleSupplier | null>;
  findUnitAcquisition: (
    input: VehicleAcquisitionScope & { unitId: string },
  ) => Promise<VehicleUnitAcquisition | null>;
  listSuppliers: (
    input: VehicleAcquisitionScope & {
      limit: number;
      search?: string | null | undefined;
    },
  ) => Promise<readonly VehicleSupplier[]>;
  updateSupplier: (
    input: VehicleAcquisitionScope & { supplierId: string },
    record: UpdateVehicleSupplierRecord,
  ) => Promise<VehicleSupplier | null>;
  upsertUnitAcquisition: (
    scope: VehicleAcquisitionScope,
    record: UpsertVehicleUnitAcquisitionRecord,
  ) => Promise<VehicleUnitAcquisition>;
};
