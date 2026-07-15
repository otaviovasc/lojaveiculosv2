import { and, eq, inArray } from "drizzle-orm";
import { financeEntries, financeEntryLinks, sales } from "@lojaveiculosv2/db";
import {
  CommissionSettlementConflictError,
  type SettleCommissionEntriesInput,
} from "../../../domains/finance/ports/commissionWorkspaceRepository.js";
import { hasUnsafeCommissionSettlementSaleLink } from "../../../domains/finance/commissionSettlementPolicy.js";
import { toEntry } from "./drizzleFinanceMappers.js";
import type { DrizzleFinanceClient } from "./drizzleFinanceRepository.js";

export async function settleDrizzleCommissionEntries(
  db: DrizzleFinanceClient,
  input: SettleCommissionEntriesInput,
) {
  if (!input.entryIds.length) return { changed: false, entries: [] };
  const expectedCount = new Set(input.entryIds).size;
  const candidateRows = await db
    .select()
    .from(financeEntries)
    .where(
      and(
        eq(financeEntries.storeId, input.storeId),
        eq(financeEntries.tenantId, input.tenantId),
        eq(financeEntries.type, "commission"),
        eq(financeEntries.sellerUserId, input.sellerUserId),
        inArray(financeEntries.id, [...input.entryIds]),
      ),
    );
  if (candidateRows.length !== expectedCount) {
    throw new CommissionSettlementConflictError();
  }
  const saleLinks = await db
    .select({
      entryId: financeEntryLinks.entryId,
      targetId: financeEntryLinks.targetId,
    })
    .from(financeEntryLinks)
    .where(
      and(
        eq(financeEntryLinks.storeId, input.storeId),
        eq(financeEntryLinks.tenantId, input.tenantId),
        eq(financeEntryLinks.targetType, "sale"),
        inArray(
          financeEntryLinks.entryId,
          candidateRows.map((row) => row.id),
        ),
      ),
    );
  const saleIds = [...new Set(saleLinks.map((link) => link.targetId))];
  const saleRows = saleIds.length
    ? await db
        .select()
        .from(sales)
        .where(
          and(
            eq(sales.storeId, input.storeId),
            eq(sales.tenantId, input.tenantId),
            inArray(sales.id, saleIds),
          ),
        )
        .orderBy(sales.id)
        .for("update")
    : [];
  const currentRows = await db
    .select()
    .from(financeEntries)
    .where(
      and(
        eq(financeEntries.storeId, input.storeId),
        eq(financeEntries.tenantId, input.tenantId),
        eq(financeEntries.type, "commission"),
        eq(financeEntries.sellerUserId, input.sellerUserId),
        inArray(financeEntries.id, [...input.entryIds]),
      ),
    )
    .orderBy(financeEntries.id)
    .for("update");
  if (
    currentRows.length !== expectedCount ||
    hasUnsafeCommissionSettlementSaleLink(
      saleLinks,
      saleRows,
      currentRows.map((row) => ({
        id: row.id,
        metadata:
          row.metadata &&
          typeof row.metadata === "object" &&
          !Array.isArray(row.metadata)
            ? (row.metadata as Record<string, unknown>)
            : {},
        sellerUserId: row.sellerUserId,
      })),
    )
  ) {
    throw new CommissionSettlementConflictError();
  }
  if (currentRows.every((row) => isSameSettlement(row, input.paidAt))) {
    return { changed: false, entries: currentRows.map(toEntry) };
  }
  if (currentRows.some((row) => row.status !== "pending")) {
    throw new CommissionSettlementConflictError();
  }
  const rows = await db
    .update(financeEntries)
    .set({ paidAt: input.paidAt, status: "paid", updatedAt: new Date() })
    .where(
      and(
        eq(financeEntries.storeId, input.storeId),
        eq(financeEntries.tenantId, input.tenantId),
        eq(financeEntries.type, "commission"),
        eq(financeEntries.status, "pending"),
        eq(financeEntries.sellerUserId, input.sellerUserId),
        inArray(financeEntries.id, [...input.entryIds]),
      ),
    )
    .returning();
  if (rows.length !== expectedCount) {
    throw new CommissionSettlementConflictError();
  }
  return { changed: true, entries: rows.map(toEntry) };
}

function isSameSettlement(
  row: typeof financeEntries.$inferSelect,
  paidAt: Date,
) {
  return row.status === "paid" && row.paidAt?.getTime() === paidAt.getTime();
}
