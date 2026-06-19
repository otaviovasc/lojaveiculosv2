import type { InferInsertModel, InferSelectModel } from "drizzle-orm";
import { salePayments, sales } from "@lojaveiculosv2/db";
import type * as schema from "@lojaveiculosv2/db";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import type {
  CreateVehicleSaleInput,
  VehicleSale,
  VehicleSaleBundle,
  VehicleSalePayment,
  VehicleSalesRepository,
} from "../../../domains/vehicle/ports/vehicleSalesRepository.js";

type SaleRow = InferSelectModel<typeof sales>;
type InsertSaleRow = InferInsertModel<typeof sales>;
type PaymentRow = InferSelectModel<typeof salePayments>;
type InsertPaymentRow = InferInsertModel<typeof salePayments>;

export type DrizzleVehicleSalesClient = PostgresJsDatabase<typeof schema>;

export function createDrizzleVehicleSalesRepository(
  db: DrizzleVehicleSalesClient,
): VehicleSalesRepository {
  return {
    async create(input) {
      const [saleRow] = await db
        .insert(sales)
        .values(toInsertSale(input))
        .returning();
      if (!saleRow) throw new Error("Drizzle adapter did not return sale.");
      if (!input.payment) return { payment: null, sale: toSale(saleRow) };
      const [paymentRow] = await db
        .insert(salePayments)
        .values(toInsertPayment(input, saleRow.id))
        .returning();
      if (!paymentRow)
        throw new Error("Drizzle adapter did not return payment.");

      return { payment: toPayment(paymentRow), sale: toSale(saleRow) };
    },
  };
}

function toInsertSale(input: CreateVehicleSaleInput): InsertSaleRow {
  return {
    buyerSnapshot: input.buyerSnapshot,
    closedAt: input.status === "closed" ? new Date() : null,
    listingId: input.listing.id,
    listingSnapshot: {
      catalog: input.listing.catalog,
      priceCents: input.listing.priceCents,
      title: input.listing.title,
      trimName: input.listing.trimName,
    },
    salePriceCents: input.salePriceCents,
    sellerUserId: input.sellerUserId,
    status: input.status,
    storeId: input.unit.storeId ?? "",
    tenantId: input.unit.tenantId ?? "",
    unitId: input.unit.id,
  };
}

function toInsertPayment(
  input: CreateVehicleSaleInput,
  saleId: string,
): InsertPaymentRow {
  const payment = input.payment;
  if (!payment) throw new Error("Missing payment input.");
  return {
    amountCents: payment.amountCents,
    method: payment.method,
    paidAt: payment.paidAt,
    saleId,
    status: payment.status,
    storeId: input.unit.storeId ?? "",
    tenantId: input.unit.tenantId ?? "",
  };
}

function toSale(row: SaleRow): VehicleSale {
  return {
    buyerSnapshot: row.buyerSnapshot as VehicleSale["buyerSnapshot"],
    closedAt: row.closedAt,
    createdAt: row.createdAt,
    id: row.id,
    listingId: row.listingId ?? "",
    salePriceCents: row.salePriceCents,
    sellerUserId: row.sellerUserId,
    status: row.status,
    storeId: row.storeId,
    tenantId: row.tenantId,
    unitId: row.unitId,
    updatedAt: row.updatedAt,
  };
}

function toPayment(row: PaymentRow): VehicleSalePayment {
  return {
    amountCents: row.amountCents,
    createdAt: row.createdAt,
    id: row.id,
    method: row.method,
    paidAt: row.paidAt,
    saleId: row.saleId,
    status: row.status,
    storeId: row.storeId,
    tenantId: row.tenantId,
    updatedAt: row.updatedAt,
  };
}
