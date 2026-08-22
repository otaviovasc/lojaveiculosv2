import { and, eq, inArray } from "drizzle-orm";
import { financeEntryLinks } from "@lojaveiculosv2/db";
import type { ListFinanceEntriesInput } from "../../../domains/finance/ports/financeRepository.js";
import type { LinkRow } from "./drizzleFinanceMappers.js";
import type { DrizzleFinanceClient } from "./drizzleFinanceRepository.js";

type FinanceScope = { storeId: string; tenantId: string };

export async function findLinksForEntries(
  db: DrizzleFinanceClient,
  entryIds: readonly string[],
  scope: FinanceScope,
): Promise<LinkRow[]> {
  if (!entryIds.length) return [];
  return db
    .select()
    .from(financeEntryLinks)
    .where(
      and(
        inArray(financeEntryLinks.entryId, [...entryIds]),
        eq(financeEntryLinks.storeId, scope.storeId),
        eq(financeEntryLinks.tenantId, scope.tenantId),
      ),
    );
}

export async function findTargetEntryIds(
  db: DrizzleFinanceClient,
  input: ListFinanceEntriesInput,
  scope: FinanceScope,
): Promise<Set<string> | null> {
  if (!input.targetId || !input.targetType) return null;
  const rows = await db
    .select({ entryId: financeEntryLinks.entryId })
    .from(financeEntryLinks)
    .where(
      and(
        eq(financeEntryLinks.storeId, scope.storeId),
        eq(financeEntryLinks.tenantId, scope.tenantId),
        eq(financeEntryLinks.targetId, input.targetId),
        eq(financeEntryLinks.targetType, input.targetType),
      ),
    );
  return new Set(rows.map(({ entryId }) => entryId));
}
