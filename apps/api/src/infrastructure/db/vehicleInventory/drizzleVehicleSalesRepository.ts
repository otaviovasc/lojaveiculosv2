import type { InferInsertModel, InferSelectModel } from "drizzle-orm";
import { and, eq, isNull } from "drizzle-orm";
import { salePayments, sales } from "@lojaveiculosv2/db";
import { isSalePaymentMethod } from "@lojaveiculosv2/shared";
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
            eq(sales.isCurrentRevision, true),
            eq(sales.isDeleted, false),
            isNull(sales.deletedAt),
          ),
        )
        .returning();
      if (!saleRow) throw new Error(`Pending sale not found: ${input.saleId}`);

      await db
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

      const paymentRows = await findSalePayments(db, input, input.saleId);

      return {
        payments: paymentRows.map(toPayment),
        sale: toSale(saleRow),
      };
    },
    async create(input) {
      const [saleRow] = await db
        .insert(sales)
        .values(toInsertVehicleWorkflowSale(input))
        .returning();
      if (!saleRow) throw new Error("Drizzle adapter did not return sale.");
      const paymentRows = input.payments.length
        ? await db
            .insert(salePayments)
            .values(
              input.payments.map((payment) =>
                toInsertPayment(input, payment, saleRow.id),
              ),
            )
            .returning()
        : [];

      return { payments: paymentRows.map(toPayment), sale: toSale(saleRow) };
    },
    async findPendingByUnit(input) {
      const saleRows = await db
        .select()
        .from(sales)
        .where(
          and(
            eq(sales.unitId, input.unitId),
            eq(sales.storeId, input.storeId ?? ""),
            eq(sales.tenantId, input.tenantId ?? ""),
            eq(sales.status, "pending"),
            eq(sales.isCurrentRevision, true),
            eq(sales.isDeleted, false),
            isNull(sales.deletedAt),
          ),
        )
        .limit(2);
      if (saleRows.length > 1) {
        throw new Error(
          `Multiple pending sales found for vehicle unit: ${input.unitId}`,
        );
      }
      const [saleRow] = saleRows;
      if (!saleRow) return null;
      const paymentRows = await findSalePayments(db, input, saleRow.id);
      return {
        payments: paymentRows.map(toPayment),
        sale: toSale(saleRow),
      };
    },
  };
}

export function toInsertVehicleWorkflowSale(
  input: CreateVehicleSaleInput,
): InsertSaleRow {
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
    selectedDocumentKinds: [...input.selectedDocumentKinds],
    sellerUserId: input.sellerUserId,
    status: input.status,
    storeId: input.unit.storeId ?? "",
    tenantId: input.unit.tenantId ?? "",
    unitId: input.unit.id,
  };
}

function toInsertPayment(
  input: CreateVehicleSaleInput,
  payment: CreateVehicleSaleInput["payments"][number],
  saleId: string,
): InsertPaymentRow {
  return {
    amountCents: payment.amountCents,
    dueAt: payment.dueAt,
    extraCents: payment.extraCents,
    installments: payment.installments,
    metadata: payment.metadata,
    method: payment.method,
    paidAt: payment.paidAt,
    principalCents: payment.principalCents,
    providerPaymentId: payment.providerPaymentId,
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
  if (!isSalePaymentMethod(row.method)) {
    throw new Error(`Unsupported sale payment method: ${row.method}`);
  }
  return {
    amountCents: row.amountCents,
    createdAt: row.createdAt,
    dueAt: row.dueAt,
    extraCents: row.extraCents,
    id: row.id,
    installments: row.installments,
    metadata:
      row.metadata &&
      typeof row.metadata === "object" &&
      !Array.isArray(row.metadata)
        ? (row.metadata as Record<string, unknown>)
        : {},
    method: row.method,
    paidAt: row.paidAt,
    principalCents: row.principalCents,
    providerPaymentId: row.providerPaymentId,
    saleId: row.saleId,
    status: row.status,
    storeId: row.storeId,
    tenantId: row.tenantId,
    updatedAt: row.updatedAt,
  };
}

function findSalePayments(
  db: DrizzleVehicleSalesClient,
  scope: { storeId: string | null; tenantId: string | null },
  saleId: string,
) {
  return db
    .select()
    .from(salePayments)
    .where(
      and(
        eq(salePayments.saleId, saleId),
        eq(salePayments.storeId, scope.storeId ?? ""),
        eq(salePayments.tenantId, scope.tenantId ?? ""),
      ),
    );
}
