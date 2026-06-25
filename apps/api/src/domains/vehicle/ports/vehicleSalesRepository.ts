import type {
  VehicleListing,
  VehicleUnit,
} from "./vehicleInventoryRepository.js";

export type VehicleSaleStatus = "cancelled" | "closed" | "draft" | "pending";
export type VehicleSalePaymentStatus =
  | "cancelled"
  | "paid"
  | "pending"
  | "refunded";

export type VehicleBuyerSnapshot = {
  address: string | null;
  document: string | null;
  email: string | null;
  name: string;
  phone: string | null;
};

export type VehicleSale = {
  buyerSnapshot: VehicleBuyerSnapshot;
  closedAt: Date | null;
  createdAt: Date;
  id: string;
  listingId: string;
  salePriceCents: number;
  sellerUserId: string | null;
  status: VehicleSaleStatus;
  storeId: string;
  tenantId: string;
  unitId: string;
  updatedAt: Date;
};

export type VehicleSalePayment = {
  amountCents: number;
  createdAt: Date;
  id: string;
  method: string;
  paidAt: Date | null;
  saleId: string;
  status: VehicleSalePaymentStatus;
  storeId: string;
  tenantId: string;
  updatedAt: Date;
};

export type CreateVehicleSaleInput = {
  buyerSnapshot: VehicleBuyerSnapshot;
  listing: VehicleListing;
  payment: {
    amountCents: number;
    method: string;
    paidAt: Date | null;
    status: VehicleSalePaymentStatus;
  } | null;
  salePriceCents: number;
  sellerUserId: string | null;
  status: VehicleSaleStatus;
  unit: VehicleUnit;
};

export type VehicleSaleBundle = {
  payment: VehicleSalePayment | null;
  sale: VehicleSale;
};

export type FindPendingVehicleSaleByUnitInput = {
  storeId: string | null;
  tenantId: string | null;
  unitId: string;
};

export type CancelVehicleSaleInput = {
  reason: string | null;
  saleId: string;
  storeId: string | null;
  tenantId: string | null;
};

export type VehicleSalesRepository = {
  cancelPending: (input: CancelVehicleSaleInput) => Promise<VehicleSaleBundle>;
  create: (input: CreateVehicleSaleInput) => Promise<VehicleSaleBundle>;
  findPendingByUnit: (
    input: FindPendingVehicleSaleByUnitInput,
  ) => Promise<VehicleSaleBundle | null>;
};
