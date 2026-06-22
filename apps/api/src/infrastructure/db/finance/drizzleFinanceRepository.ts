import { and, desc, eq, inArray } from "drizzle-orm";
import type { InferInsertModel, InferSelectModel } from "drizzle-orm";
import {
  commissionRules,
  financeEntries,
  financeEntryLinks,
  financeRecurringEntries,
} from "@lojaveiculosv2/db";
import type * as schema from "@lojaveiculosv2/db";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import type {
  FinanceRepository,
  ListFinanceEntriesInput,
} from "../../../domains/finance/ports/financeRepository.js";
import {
  toCommissionRule,
  toEntry,
  toInsertCommissionRule,
  toInsertEntry,
  toInsertLink,
  toInsertRecurringEntry,
  toLink,
  toRecurringEntry,
  toUpdateEntry,
  type LinkRow,
} from "./drizzleFinanceMappers.js";
import { validateFinanceLinkTargets } from "./drizzleFinanceLinkTargets.js";

export type DrizzleFinanceClient = PostgresJsDatabase<typeof schema>;

export function createDrizzleFinanceRepository(
  db: DrizzleFinanceClient,
): FinanceRepository {
  return {
    async createCommissionRule(input) {
      const [row] = await db
        .insert(commissionRules)
        .values(toInsertCommissionRule(input))
        .returning();
      if (!row)
        throw new Error("Drizzle adapter did not return commission rule.");
      return toCommissionRule(row);
    },
    async createEntry(input) {
      await validateFinanceLinkTargets(db, {
        links: input.links,
        storeId: input.storeId,
        tenantId: input.tenantId,
      });
      const [entryRow] = await db
        .insert(financeEntries)
        .values(toInsertEntry(input))
        .returning();
      if (!entryRow)
        throw new Error("Drizzle adapter did not return finance entry.");
      const linkRows = input.links.length
        ? await db
            .insert(financeEntryLinks)
            .values(
              input.links.map((link) => toInsertLink(input, entryRow.id, link)),
            )
            .returning()
        : [];
      return { entry: toEntry(entryRow), links: linkRows.map(toLink) };
    },
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
    async findById(input) {
      const scope = requireFinanceScope(input);
      const [entryRow] = await db
        .select()
        .from(financeEntries)
        .where(
          and(
            eq(financeEntries.id, input.entryId),
            eq(financeEntries.storeId, scope.storeId),
            eq(financeEntries.tenantId, scope.tenantId),
          ),
        );

      if (!entryRow) return null;
      const linkRows = await findLinksForEntries([entryRow.id], scope);
      return { entry: toEntry(entryRow), links: linkRows.map(toLink) };
    },
    async list(input) {
      const scope = requireFinanceScope(input);
      const filters = [
        eq(financeEntries.storeId, scope.storeId),
        eq(financeEntries.tenantId, scope.tenantId),
      ];
      if (input.type) filters.push(eq(financeEntries.type, input.type));
      if (input.status) filters.push(eq(financeEntries.status, input.status));
      const targetEntryIds = await findTargetEntryIds(input, scope);
      if (targetEntryIds?.size === 0) return [];
      if (targetEntryIds) {
        filters.push(inArray(financeEntries.id, [...targetEntryIds]));
      }

      const rows = await db
        .select()
        .from(financeEntries)
        .where(and(...filters))
        .orderBy(desc(financeEntries.updatedAt), desc(financeEntries.id))
        .limit(input.limit)
        .offset(input.offset);
      const linkRows = await findLinksForEntries(
        rows.map((row) => row.id),
        scope,
      );

      return rows.map((row) => ({
        entry: toEntry(row),
        links: linkRows.filter((link) => link.entryId === row.id).map(toLink),
      }));
    },
    async listCommissionRules(input) {
      const scope = requireFinanceScope(input);
      const rows = await db.select().from(commissionRules);
      return rows
        .filter((row) => row.storeId === scope.storeId)
        .filter((row) => row.tenantId === scope.tenantId)
        .filter((row) => !input.status || row.status === input.status)
        .filter(
          (row) =>
            !input.sellerUserId || row.sellerUserId === input.sellerUserId,
        )
        .sort(
          (left, right) => right.updatedAt.getTime() - left.updatedAt.getTime(),
        )
        .slice(0, input.limit)
        .map(toCommissionRule);
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
    async updateEntry(input) {
      const scope = requireFinanceScope(input);
      const [row] = await db
        .update(financeEntries)
        .set(toUpdateEntry(input))
        .where(
          and(
            eq(financeEntries.id, input.entryId),
            eq(financeEntries.storeId, scope.storeId),
            eq(financeEntries.tenantId, scope.tenantId),
          ),
        )
        .returning();
      if (!row) throw new FinanceEntryDrizzleNotFoundError(input.entryId);
      const linkRows = await findLinksForEntries([row.id], scope);
      return { entry: toEntry(row), links: linkRows.map(toLink) };
    },
  };

  async function findLinksForEntries(
    entryIds: readonly string[],
    scope: { storeId: string; tenantId: string },
  ): Promise<LinkRow[]> {
    if (!entryIds.length) return [];
    const rows = await db.select().from(financeEntryLinks);
    return rows.filter(
      (row) =>
        entryIds.includes(row.entryId) &&
        row.storeId === scope.storeId &&
        row.tenantId === scope.tenantId,
    );
  }

  async function findTargetEntryIds(
    input: ListFinanceEntriesInput,
    scope: { storeId: string; tenantId: string },
  ): Promise<Set<string> | null> {
    if (!input.targetId || !input.targetType) return null;
    const rows = await db.select().from(financeEntryLinks);
    return new Set(
      rows
        .filter((row) => row.storeId === scope.storeId)
        .filter((row) => row.tenantId === scope.tenantId)
        .filter((row) => row.targetId === input.targetId)
        .filter((row) => row.targetType === input.targetType)
        .map((row) => row.entryId),
    );
  }
}

function requireFinanceScope(input: {
  storeId: string | null;
  tenantId: string | null;
}): { storeId: string; tenantId: string } {
  if (!input.storeId) throw new FinanceDrizzleScopeError("storeId");
  if (!input.tenantId) throw new FinanceDrizzleScopeError("tenantId");
  return { storeId: input.storeId, tenantId: input.tenantId };
}

export class FinanceDrizzleScopeError extends Error {
  constructor(fieldName: string) {
    super(`Finance drizzle repository requires ${fieldName}.`);
    this.name = "FinanceDrizzleScopeError";
  }
}

export class FinanceEntryDrizzleNotFoundError extends Error {
  constructor(entryId: string) {
    super(`Finance entry not found: ${entryId}`);
    this.name = "FinanceEntryDrizzleNotFoundError";
  }
}
