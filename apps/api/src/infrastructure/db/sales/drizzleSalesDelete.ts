import { and, eq } from "drizzle-orm";
import { salePayments, sales } from "@lojaveiculosv2/db";
import type {
  SaleRecord,
  SaleScope,
} from "../../../domains/sales/ports/salesRepository.js";
import { SaleDraftDeletionStateError } from "../../../domains/sales/services/SalesService/serviceSupport.js";
import { toSaleRecord } from "./drizzleSalesMappers.js";
import type { DrizzleSalesClient } from "./drizzleSalesRepository.js";

export async function deleteSalesDraft(
  db: DrizzleSalesClient,
  scope: SaleScope,
  saleId: string,
): Promise<SaleRecord> {
  const [current] = await db
    .select({ status: sales.status })
    .from(sales)
    .where(scopedSaleWhere(scope, saleId))
    .for("update");
  if (!current) throw new Error(`Sale not found: ${saleId}`);
  if (current.status !== "draft") {
    throw new SaleDraftDeletionStateError(current.status);
  }
  await db
    .delete(salePayments)
    .where(
      and(
        eq(salePayments.saleId, saleId),
        eq(salePayments.storeId, scope.storeId),
        eq(salePayments.tenantId, scope.tenantId),
      ),
    );
  const [row] = await db
    .delete(sales)
    .where(and(scopedSaleWhere(scope, saleId), eq(sales.status, "draft")))
    .returning();
  if (!row) throw new SaleDraftDeletionStateError(current.status);
  return toSaleRecord(row, []);
}

function scopedSaleWhere(scope: SaleScope, saleId: string) {
  return and(
    eq(sales.id, saleId),
    eq(sales.storeId, scope.storeId),
    eq(sales.tenantId, scope.tenantId),
  );
}
