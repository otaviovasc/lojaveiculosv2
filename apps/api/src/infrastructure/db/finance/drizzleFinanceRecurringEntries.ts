import { and, eq } from "drizzle-orm";
import { financeRecurringEntries } from "@lojaveiculosv2/db";
import type { FinanceRepository } from "../../../domains/finance/ports/financeRepository.js";
import type { DrizzleFinanceClient } from "./drizzleFinanceRepository.js";
import {
  toInsertRecurringEntry,
  toRecurringEntry,
  toUpdateRecurringEntry,
} from "./drizzleFinanceMappers.js";
import { requireFinanceScope } from "./drizzleFinanceScope.js";

export function createDrizzleFinanceRecurringEntriesRepository(
  db: DrizzleFinanceClient,
): Pick<
  FinanceRepository,
  | "createRecurringEntry"
  | "findRecurringById"
  | "listRecurringEntries"
  | "updateRecurringEntry"
> {
  return {
    async createRecurringEntry(input) {
      const [row] = await db
        .insert(financeRecurringEntries)
        .values(toInsertRecurringEntry(input))
        .returning();
      if (!row) {
        throw new Error(
          "Drizzle adapter did not return recurring finance entry.",
        );
      }
      return toRecurringEntry(row);
    },
    async findRecurringById(input) {
      const scope = requireFinanceScope(input);
      const [row] = await db
        .select()
        .from(financeRecurringEntries)
        .where(
          and(
            eq(financeRecurringEntries.id, input.recurringEntryId),
            eq(financeRecurringEntries.storeId, scope.storeId),
            eq(financeRecurringEntries.tenantId, scope.tenantId),
          ),
        );
      return row ? toRecurringEntry(row) : null;
    },
    async listRecurringEntries(input) {
      const scope = requireFinanceScope(input);
      const rows = await db.select().from(financeRecurringEntries);
      return rows
        .filter((row) => row.storeId === scope.storeId)
        .filter((row) => row.tenantId === scope.tenantId)
        .filter((row) => !input.type || row.type === input.type)
        .sort(
          (left, right) => right.updatedAt.getTime() - left.updatedAt.getTime(),
        )
        .slice(0, input.limit)
        .map(toRecurringEntry);
    },
    async updateRecurringEntry(input) {
      const scope = requireFinanceScope(input);
      const [row] = await db
        .update(financeRecurringEntries)
        .set(toUpdateRecurringEntry(input))
        .where(
          and(
            eq(financeRecurringEntries.id, input.recurringEntryId),
            eq(financeRecurringEntries.storeId, scope.storeId),
            eq(financeRecurringEntries.tenantId, scope.tenantId),
          ),
        )
        .returning();
      if (!row) {
        throw new FinanceRecurringEntryDrizzleNotFoundError(
          input.recurringEntryId,
        );
      }
      return toRecurringEntry(row);
    },
  };
}

export class FinanceRecurringEntryDrizzleNotFoundError extends Error {
  constructor(recurringEntryId: string) {
    super(`Finance recurring entry not found: ${recurringEntryId}`);
    this.name = "FinanceRecurringEntryDrizzleNotFoundError";
  }
}
