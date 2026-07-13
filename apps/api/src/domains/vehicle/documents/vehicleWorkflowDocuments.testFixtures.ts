import type { DocumentTemplate } from "../../documents/ports/documentRepository.js";
import type {
  VehicleListing,
  VehicleUnit,
} from "../ports/vehicleInventoryRepository.js";
import type {
  VehicleBuyerSnapshot,
  VehicleSaleBundle,
  VehicleSalePayment,
} from "../ports/vehicleSalesRepository.js";

export function template(
  kind: DocumentTemplate["kind"],
  title: string,
): DocumentTemplate {
  const clause = {
    body: "Comprador {{buyer.name}}",
    id: "clause_1",
    type: "clause" as const,
  };
  return {
    availableVariables: ["{{buyer.name}}"],
    blocks: [clause],
    category: "Legal",
    clauses: [clause.body],
    context: "sale",
    defaultBlocks: [clause],
    defaultClauses: [clause.body],
    defaultTitle: title,
    description: "Modelo de teste",
    isCustomized: true,
    kind,
    mode: "editable",
    source: "store",
    templateKey: kind,
    title,
    updatedAt: new Date("2026-01-01T00:00:00.000Z"),
  };
}

export const buyer: VehicleBuyerSnapshot = {
  address: "Rua A",
  document: "000.000.000-00",
  email: "ana@example.com",
  name: "Ana Cliente",
  phone: "11999999999",
};

export const listing = {
  catalog: null,
  id: "listing_1",
  manufactureYear: 2022,
  modelYear: 2023,
  plate: "ABC1D23",
  priceCents: 12690000,
  storeId: "store_1",
  tenantId: "tenant_1",
  title: "Fiat Toro Volcano 2023",
  trimName: "Volcano",
} as VehicleListing;

export const unit = {
  id: "unit_1",
  plate: "ABC1D23",
  vin: "9BD00000000000000",
} as VehicleUnit;

export const salePayment: VehicleSalePayment = {
  amountCents: 12690000,
  createdAt: new Date("2026-01-01T00:00:00.000Z"),
  dueAt: new Date("2026-01-01T00:00:00.000Z"),
  extraCents: 0,
  id: "payment_1",
  installments: null,
  metadata: {},
  method: "pix",
  paidAt: new Date("2026-01-01T00:00:00.000Z"),
  principalCents: 12690000,
  providerPaymentId: null,
  saleId: "sale_1",
  status: "paid",
  storeId: "store_1",
  tenantId: "tenant_1",
  updatedAt: new Date("2026-01-01T00:00:00.000Z"),
};

export const sale: VehicleSaleBundle = {
  payments: [salePayment],
  sale: {
    buyerSnapshot: buyer,
    closedAt: new Date("2026-01-01T00:00:00.000Z"),
    createdAt: new Date("2026-01-01T00:00:00.000Z"),
    id: "sale_1",
    salePriceCents: 12690000,
    sellerUserId: "user_1",
    status: "closed",
    storeId: "store_1",
    tenantId: "tenant_1",
    unitId: "unit_1",
    updatedAt: new Date("2026-01-01T00:00:00.000Z"),
  },
};
