import type {
  SalePaymentMethod,
  SalePaymentStatus,
} from "@lojaveiculosv2/shared";
import type {
  VehicleListing,
  VehicleUnit,
} from "./vehicleInventoryRepository.js";

export type VehicleSaleStatus = "cancelled" | "closed" | "draft" | "pending";
export type VehicleSalePaymentStatus = SalePaymentStatus;

export type VehicleBuyerSnapshot = {
  address: string | null;
  cep?: string | null | undefined;
  city?: string | null | undefined;
  district?: string | null | undefined;
  document: string | null;
  email: string | null;
  name: string;
  phone: string | null;
  state?: string | null | undefined;
};

export type VehicleSale = {
  buyerSnapshot: VehicleBuyerSnapshot;
  closedAt: Date | null;
  createdAt: Date;
  id: string;
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
  dueAt: Date | null;
  extraCents: number;
  id: string;
  installments: number | null;
  metadata: Record<string, unknown>;
  method: SalePaymentMethod;
  paidAt: Date | null;
  principalCents: number;
  providerPaymentId: string | null;
  saleId: string;
  status: VehicleSalePaymentStatus;
  storeId: string;
  tenantId: string;
  updatedAt: Date;
};

export type CreateVehicleSaleInput = {
  buyerSnapshot: VehicleBuyerSnapshot;
  listing: VehicleListing;
  payments: readonly {
    amountCents: number;
    dueAt: Date | null;
    extraCents: number;
    installments: number | null;
    metadata: Record<string, unknown>;
    method: SalePaymentMethod;
    paidAt: Date | null;
    principalCents: number;
    providerPaymentId: string | null;
    status: VehicleSalePaymentStatus;
  }[];
  salePriceCents: number;
  selectedDocumentKinds: readonly string[];
  sellerUserId: string | null;
  status: VehicleSaleStatus;
  unit: VehicleUnit;
};

export type VehicleSaleBundle = {
  payments: readonly VehicleSalePayment[];
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
