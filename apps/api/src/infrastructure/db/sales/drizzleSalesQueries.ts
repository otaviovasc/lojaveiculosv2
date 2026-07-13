import { salePayments } from "@lojaveiculosv2/db";
import { and, eq, inArray } from "drizzle-orm";
import type { SaleScope } from "../../../domains/sales/ports/salesRepository.js";
import type { DrizzleSalesClient } from "./drizzleSalesRepository.js";
import type { PaymentRow } from "./drizzleSalesMappers.js";

export async function findPaymentsForSales(
  db: DrizzleSalesClient,
  scope: SaleScope,
  saleIds: readonly string[],
): Promise<Map<string, PaymentRow[]>> {
  const result = new Map<string, PaymentRow[]>();
  if (!saleIds.length) return result;
  const rows = await db
    .select()
    .from(salePayments)
    .where(
      and(
        inArray(salePayments.saleId, saleIds),
        eq(salePayments.storeId, scope.storeId),
        eq(salePayments.tenantId, scope.tenantId),
      ),
    );
  for (const row of rows) {
    result.set(row.saleId, [...(result.get(row.saleId) ?? []), row]);
  }
  return result;
}
