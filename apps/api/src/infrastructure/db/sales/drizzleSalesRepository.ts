import { and, desc, eq } from "drizzle-orm";
import { salePayments, sales } from "@lojaveiculosv2/db";
import type * as schema from "@lojaveiculosv2/db";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import type {
  ListSalesInput,
  SalesRepository,
  SaleScope,
  SaveSalePaymentInput,
} from "../../../domains/sales/ports/salesRepository.js";
import {
  toInsertPayment,
  toInsertSale,
  toSaleRecord,
  toUpdateSale,
  type PaymentRow,
} from "./drizzleSalesMappers.js";

export type DrizzleSalesClient = PostgresJsDatabase<typeof schema>;

export function createDrizzleSalesRepository(
  db: DrizzleSalesClient,
): SalesRepository {
  return {
    async createDraft(scope, input) {
      const [row] = await db
        .insert(sales)
        .values(toInsertSale(scope, input))
        .returning();
      if (!row) throw new Error("Drizzle adapter did not return sale.");
      const payments = await replacePayments(db, scope, row.id, input.payments);
      return toSaleRecord(row, payments);
    },
    async findById(scope, saleId) {
      const [row] = await db
        .select()
        .from(sales)
        .where(scopedSaleWhere(scope, saleId));
      if (!row) return null;
      return toSaleRecord(row, await findPayments(db, scope, saleId));
    },
    async list(input) {
      const filters = [
        eq(sales.storeId, input.storeId),
        eq(sales.tenantId, input.tenantId),
      ];
      if (input.status && input.status !== "all") {
        filters.push(eq(sales.status, input.status));
      }
      if (input.leadId) filters.push(eq(sales.leadId, input.leadId));
      if (input.unitId) filters.push(eq(sales.unitId, input.unitId));
      if (input.sellerUserId) {
        filters.push(eq(sales.sellerUserId, input.sellerUserId));
      }
      const rows = await db
        .select()
        .from(sales)
        .where(and(...filters))
        .orderBy(desc(sales.updatedAt), desc(sales.id))
        .limit(input.limit)
        .offset(input.offset);
      const payments = await findPaymentsForSales(
        db,
        input,
        rows.map((row) => row.id),
      );
      return rows.map((row) => toSaleRecord(row, payments.get(row.id) ?? []));
    },
    async transition(input) {
      const [row] = await db
        .update(sales)
        .set({
          closedAt: input.closedAt ?? null,
          overrideReason: input.overrideReason ?? null,
          overrideRequiredFields: input.overrideRequiredFields ?? false,
          status: input.status,
        })
        .where(scopedSaleWhere(input, input.saleId))
        .returning();
      if (!row) throw new Error(`Sale not found: ${input.saleId}`);
      if (input.status === "cancelled") {
        await db
          .update(salePayments)
          .set({ status: "cancelled" })
          .where(
            and(
              eq(salePayments.saleId, input.saleId),
              eq(salePayments.storeId, input.storeId),
              eq(salePayments.tenantId, input.tenantId),
              eq(salePayments.status, "pending"),
            ),
          );
      }
      return toSaleRecord(row, await findPayments(db, input, input.saleId));
    },
    async updateDraft(scope, saleId, input) {
      const [row] = await db
        .update(sales)
        .set(toUpdateSale(input))
        .where(scopedSaleWhere(scope, saleId))
        .returning();
      if (!row) throw new Error(`Sale not found: ${saleId}`);
      const payments = input.payments
        ? await replacePayments(db, scope, saleId, input.payments)
        : await findPayments(db, scope, saleId);
      return toSaleRecord(row, payments);
    },
  };
}

async function replacePayments(
  db: DrizzleSalesClient,
  scope: SaleScope,
  saleId: string,
  payments: readonly SaveSalePaymentInput[] = [],
): Promise<readonly PaymentRow[]> {
  await db
    .delete(salePayments)
    .where(
      and(
        eq(salePayments.saleId, saleId),
        eq(salePayments.storeId, scope.storeId),
        eq(salePayments.tenantId, scope.tenantId),
      ),
    );
  if (!payments.length) return [];
  return db
    .insert(salePayments)
    .values(payments.map((payment) => toInsertPayment(scope, saleId, payment)))
    .returning();
}

async function findPayments(
  db: DrizzleSalesClient,
  scope: SaleScope,
  saleId: string,
): Promise<readonly PaymentRow[]> {
  return db
    .select()
    .from(salePayments)
    .where(
      and(
        eq(salePayments.saleId, saleId),
        eq(salePayments.storeId, scope.storeId),
        eq(salePayments.tenantId, scope.tenantId),
      ),
    );
}

async function findPaymentsForSales(
  db: DrizzleSalesClient,
  scope: SaleScope,
  saleIds: readonly string[],
): Promise<Map<string, PaymentRow[]>> {
  const result = new Map<string, PaymentRow[]>();
  if (!saleIds.length) return result;
  const rows = await db.select().from(salePayments);
  for (const row of rows) {
    if (
      saleIds.includes(row.saleId) &&
      row.storeId === scope.storeId &&
      row.tenantId === scope.tenantId
    ) {
      result.set(row.saleId, [...(result.get(row.saleId) ?? []), row]);
    }
  }
  return result;
}

function scopedSaleWhere(scope: SaleScope, saleId: string) {
  return and(
    eq(sales.id, saleId),
    eq(sales.storeId, scope.storeId),
    eq(sales.tenantId, scope.tenantId),
  );
}
