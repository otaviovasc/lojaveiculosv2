import type { InferInsertModel, InferSelectModel } from "drizzle-orm";
import { and, eq } from "drizzle-orm";
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
    async cancelPending(input) {
      const [saleRow] = await db
        .update(sales)
        .set({
          closedAt: null,
          overrideReason: input.reason,
          status: "cancelled",
        })
        .where(
          and(
            eq(sales.id, input.saleId),
            eq(sales.storeId, input.storeId ?? ""),
            eq(sales.tenantId, input.tenantId ?? ""),
            eq(sales.status, "pending"),
          ),
        )
        .returning();
      if (!saleRow) throw new Error(`Pending sale not found: ${input.saleId}`);

      const paymentRows = await db
        .update(salePayments)
        .set({ status: "cancelled" })
        .where(
          and(
            eq(salePayments.saleId, input.saleId),
            eq(salePayments.storeId, input.storeId ?? ""),
            eq(salePayments.tenantId, input.tenantId ?? ""),
            eq(salePayments.status, "pending"),
          ),
        )
        .returning();

      return {
        payment: paymentRows[0] ? toPayment(paymentRows[0]) : null,
        sale: toSale(saleRow),
      };
    },
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
    async findPendingByUnit(input) {
      const [saleRow] = await db
        .select()
        .from(sales)
        .where(
          and(
            eq(sales.unitId, input.unitId),
            eq(sales.storeId, input.storeId ?? ""),
            eq(sales.tenantId, input.tenantId ?? ""),
            eq(sales.status, "pending"),
          ),
        );
      if (!saleRow) return null;
      const [paymentRow] = await db
        .select()
        .from(salePayments)
        .where(
          and(
            eq(salePayments.saleId, saleRow.id),
            eq(salePayments.storeId, input.storeId ?? ""),
            eq(salePayments.tenantId, input.tenantId ?? ""),
          ),
        );
      return {
        payment: paymentRow ? toPayment(paymentRow) : null,
        sale: toSale(saleRow),
      };
    },
  };
}

function toInsertSale(input: CreateVehicleSaleInput): InsertSaleRow {
  return {
    buyerSnapshot: input.buyerSnapshot,
    closedAt: input.status === "closed" ? new Date() : null,
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
  if (row.salePriceCents === null || row.unitId === null) {
    throw new Error(
      "Vehicle workflow sale row is missing completed sale data.",
    );
  }

  return {
    buyerSnapshot: row.buyerSnapshot as VehicleSale["buyerSnapshot"],
    closedAt: row.closedAt,
    createdAt: row.createdAt,
    id: row.id,
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
