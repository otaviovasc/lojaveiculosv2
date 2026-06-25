export type VehicleSupplierKind =
  | "auction"
  | "company"
  | "lead"
  | "other"
  | "partner"
  | "person"
  | "provider";

export type VehicleAcquisitionChannel =
  | "auction"
  | "auto_avaliar"
  | "consignment"
  | "direct_person"
  | "marketplace"
  | "other"
  | "repasse_partner"
  | "supplier_company"
  | "trade_in_lead";

export type VehicleAcquisitionCommissionTiming =
  | "acquisition"
  | "closed"
  | "reserve";

export type VehicleSupplier = {
  createdAt: string;
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
  updatedAt: string;
};

export type VehicleUnitAcquisition = {
  acquisitionDate: string | null;
  acquisitionPriceCents: number | null;
  acquisitionUserId: string | null;
  channel: VehicleAcquisitionChannel;
  commissionTiming: VehicleAcquisitionCommissionTiming;
  createdAt: string;
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
  updatedAt: string;
};

export type CreateVehicleSupplierInput = {
  displayName: string;
  documentNumber?: string | null;
  email?: string | null;
  externalProviderId?: string | null;
  kind: VehicleSupplierKind;
  phone?: string | null;
  provider?: string | null;
};

export type UpdateVehicleSupplierInput = Partial<CreateVehicleSupplierInput>;

export type UpsertVehicleUnitAcquisitionInput = {
  acquisitionDate?: string | null;
  acquisitionPriceCents?: number | null;
  acquisitionUserId?: string | null;
  channel: VehicleAcquisitionChannel;
  commissionTiming?: VehicleAcquisitionCommissionTiming;
  customChannelLabel?: string | null;
  leadId?: string | null;
  notes?: string | null;
  supplierId?: string | null;
};
