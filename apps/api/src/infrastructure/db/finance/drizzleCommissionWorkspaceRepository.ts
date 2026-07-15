import { and, desc, eq, gte, inArray, isNull, lte, or } from "drizzle-orm";
import {
  financeEntries,
  financeEntryLinks,
  sales,
  users,
} from "@lojaveiculosv2/db";
import {
  type CommissionWorkspaceRepository,
  type CommissionWorkspaceSaleRecord,
  type ReadCommissionWorkspaceInput,
} from "../../../domains/finance/ports/commissionWorkspaceRepository.js";
import { toEntry, toLink } from "./drizzleFinanceMappers.js";
import type { DrizzleFinanceClient } from "./drizzleFinanceRepository.js";
import { settleDrizzleCommissionEntries } from "./drizzleCommissionSettlement.js";

export function createDrizzleCommissionWorkspaceRepository(
  db: DrizzleFinanceClient,
): CommissionWorkspaceRepository {
  return {
    async read(input) {
      const [primarySales, inRangeEntries] = await Promise.all([
        readPeriodSales(db, input),
        db
          .select()
          .from(financeEntries)
          .where(
            and(
              financeScope(input),
              eq(financeEntries.type, "commission"),
              gte(financeEntries.createdAt, input.from),
              lte(financeEntries.createdAt, input.to),
            ),
          )
          .orderBy(desc(financeEntries.createdAt), desc(financeEntries.id)),
      ]);
      const primaryLinks = await readPrimarySaleLinks(
        db,
        input,
        primarySales.map((sale) => sale.id),
      );
      const entryIds = new Set([
        ...inRangeEntries.map((entry) => entry.id),
        ...primaryLinks.map((link) => link.entryId),
      ]);
      const entryRows = entryIds.size
        ? await db
            .select()
            .from(financeEntries)
            .where(
              and(
                financeScope(input),
                eq(financeEntries.type, "commission"),
                inArray(financeEntries.id, [...entryIds]),
              ),
            )
            .orderBy(desc(financeEntries.createdAt), desc(financeEntries.id))
        : [];
      const links = entryRows.length
        ? await db
            .select()
            .from(financeEntryLinks)
            .where(
              and(
                linkScope(input),
                inArray(
                  financeEntryLinks.entryId,
                  entryRows.map((entry) => entry.id),
                ),
              ),
            )
        : [];
      const relatedSaleIds = new Set(
        links
          .filter((link) => link.targetType === "sale")
          .map((link) => link.targetId),
      );
      const relatedSales = relatedSaleIds.size
        ? await db
            .select()
            .from(sales)
            .where(
              and(saleScope(input), inArray(sales.id, [...relatedSaleIds])),
            )
        : [];
      const saleRows = new Map(
        [...primarySales, ...relatedSales].map((sale) => [sale.id, sale]),
      );
      const sellerIds = new Set(
        [
          ...entryRows.map((entry) => entry.sellerUserId),
          ...[...saleRows.values()].map((sale) => sale.sellerUserId),
        ].filter((sellerId): sellerId is string => Boolean(sellerId)),
      );
      const sellerRows = sellerIds.size
        ? await db
            .select({ id: users.id, name: users.name })
            .from(users)
            .where(
              and(
                eq(users.tenantId, input.tenantId),
                inArray(users.id, [...sellerIds]),
              ),
            )
        : [];
      const linksByEntry = new Map<string, typeof links>();
      for (const link of links) {
        linksByEntry.set(link.entryId, [
          ...(linksByEntry.get(link.entryId) ?? []),
          link,
        ]);
      }

      return {
        entries: entryRows.map((entry) => ({
          entry: toEntry(entry),
          links: (linksByEntry.get(entry.id) ?? []).map(toLink),
        })),
        sales: [...saleRows.values()].map(toCommissionSale),
        sellerNames: Object.fromEntries(
          sellerRows.map((seller) => [
            seller.id,
            seller.name?.trim() || `Vendedor ${seller.id.slice(0, 8)}`,
          ]),
        ),
      };
    },
    settleEntries: (input) => settleDrizzleCommissionEntries(db, input),
  };
}

async function readPeriodSales(
  db: DrizzleFinanceClient,
  input: ReadCommissionWorkspaceInput,
) {
  return db
    .select()
    .from(sales)
    .where(
      and(
        saleScope(input),
        eq(sales.isCurrentRevision, true),
        eq(sales.isDeleted, false),
        isNull(sales.deletedAt),
        or(eq(sales.status, "closed"), eq(sales.status, "cancelled")),
        gte(sales.closedAt, input.from),
        lte(sales.closedAt, input.to),
      ),
    )
    .orderBy(desc(sales.closedAt), desc(sales.id));
}

async function readPrimarySaleLinks(
  db: DrizzleFinanceClient,
  input: ReadCommissionWorkspaceInput,
  saleIds: readonly string[],
) {
  if (!saleIds.length) return [];
  return db
    .select()
    .from(financeEntryLinks)
    .where(
      and(
        linkScope(input),
        eq(financeEntryLinks.targetType, "sale"),
        inArray(financeEntryLinks.targetId, [...saleIds]),
      ),
    );
}

function financeScope(input: { storeId: string; tenantId: string }) {
  return and(
    eq(financeEntries.storeId, input.storeId),
    eq(financeEntries.tenantId, input.tenantId),
  );
}

function linkScope(input: { storeId: string; tenantId: string }) {
  return and(
    eq(financeEntryLinks.storeId, input.storeId),
    eq(financeEntryLinks.tenantId, input.tenantId),
  );
}

function saleScope(input: { storeId: string; tenantId: string }) {
  return and(
    eq(sales.storeId, input.storeId),
    eq(sales.tenantId, input.tenantId),
  );
}

function toCommissionSale(
  row: typeof sales.$inferSelect,
): CommissionWorkspaceSaleRecord {
  const saleSourceSnapshot = toRecord(row.saleSourceSnapshot);
  const commission = toRecord(saleSourceSnapshot.commission);
  return {
    closedAt: row.closedAt,
    createdAt: row.createdAt,
    id: row.id,
    isCurrentRevision: row.isCurrentRevision,
    listingSnapshot: toRecord(row.listingSnapshot),
    salePriceCents: row.salePriceCents,
    sellerUserId: row.sellerUserId,
    standardCommissionEnabled: commission.enabled === true,
    status: row.status,
    unitId: row.unitId,
    updatedAt: row.updatedAt,
  };
}

function toRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}
