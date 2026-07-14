import { and, asc, desc, eq, inArray, isNull, sql } from "drizzle-orm";
import {
  financeAutoEntryExecutions,
  financeAutoEntryRules,
  storeMemberships,
} from "@lojaveiculosv2/db";
import type { FinanceAutoEntryRepository } from "../../../domains/finance/ports/financeAutoEntryRepository.js";
import type { DrizzleFinanceClient } from "./drizzleFinanceRepository.js";
import {
  toFinanceAutoEntryExecution,
  toFinanceAutoEntryRule,
  toInsertFinanceAutoEntryExecution,
  toInsertFinanceAutoEntryRule,
  toUpdateFinanceAutoEntryRule,
} from "./drizzleFinanceAutoEntryMappers.js";

export function createDrizzleFinanceAutoEntryRepository(
  db: DrizzleFinanceClient,
): FinanceAutoEntryRepository {
  return {
    async createExecution(input) {
      const [row] = await db
        .insert(financeAutoEntryExecutions)
        .values(toInsertFinanceAutoEntryExecution(input))
        .returning();
      if (!row) throw new Error("Missing finance auto-entry execution row.");
      return toFinanceAutoEntryExecution(row);
    },
    async createRule(input) {
      const [row] = await db
        .insert(financeAutoEntryRules)
        .values(toInsertFinanceAutoEntryRule(input))
        .returning();
      if (!row) throw new Error("Missing finance auto-entry rule row.");
      return toFinanceAutoEntryRule(row);
    },
    async ensureRules(input) {
      const scope = requireAutoEntryScope(input);
      if (!input.rules.length) return [];
      const ruleKeys = input.rules.map((rule) => rule.ruleKey);
      if (ruleKeys.some((ruleKey) => !ruleKey.trim())) {
        throw new Error("Finance auto-entry ensured rules require ruleKey.");
      }
      await db
        .insert(financeAutoEntryRules)
        .values(
          input.rules.map((rule) =>
            toInsertFinanceAutoEntryRule({ ...rule, ...scope }),
          ),
        )
        .onConflictDoNothing();
      const rows = await db
        .select()
        .from(financeAutoEntryRules)
        .where(
          and(
            eq(financeAutoEntryRules.storeId, scope.storeId),
            eq(financeAutoEntryRules.tenantId, scope.tenantId),
            inArray(financeAutoEntryRules.ruleKey, ruleKeys),
            isNull(financeAutoEntryRules.sellerUserId),
          ),
        );
      const rowsByKey = new Map(rows.map((row) => [row.ruleKey, row]));
      return ruleKeys.flatMap((ruleKey) => {
        const row = rowsByKey.get(ruleKey);
        return row ? [toFinanceAutoEntryRule(row)] : [];
      });
    },
    async findExecution(input) {
      const scope = requireAutoEntryScope(input);
      const [row] = await db
        .select()
        .from(financeAutoEntryExecutions)
        .where(
          and(
            eq(financeAutoEntryExecutions.ruleId, input.ruleId),
            eq(financeAutoEntryExecutions.sourceId, input.sourceId),
            eq(financeAutoEntryExecutions.sourceRevision, input.sourceRevision),
            eq(financeAutoEntryExecutions.sourceType, input.sourceType),
            eq(financeAutoEntryExecutions.storeId, scope.storeId),
            eq(financeAutoEntryExecutions.tenantId, scope.tenantId),
          ),
        );
      return row ? toFinanceAutoEntryExecution(row) : null;
    },
    async findRuleById(input) {
      const scope = requireAutoEntryScope(input);
      const [row] = await db
        .select()
        .from(financeAutoEntryRules)
        .where(
          and(
            eq(financeAutoEntryRules.id, input.ruleId),
            eq(financeAutoEntryRules.storeId, scope.storeId),
            eq(financeAutoEntryRules.tenantId, scope.tenantId),
          ),
        );
      return row ? toFinanceAutoEntryRule(row) : null;
    },
    async isActiveStoreMember(input) {
      const [membership] = await db
        .select({ id: storeMemberships.id })
        .from(storeMemberships)
        .where(
          and(
            eq(storeMemberships.storeId, input.storeId),
            eq(storeMemberships.tenantId, input.tenantId),
            eq(storeMemberships.userId, input.userId),
            eq(storeMemberships.status, "active"),
          ),
        )
        .limit(1);
      return Boolean(membership);
    },
    async listRules(input) {
      const scope = requireAutoEntryScope(input);
      const filters = [
        eq(financeAutoEntryRules.storeId, scope.storeId),
        eq(financeAutoEntryRules.tenantId, scope.tenantId),
      ];
      if (input.event) {
        filters.push(eq(financeAutoEntryRules.event, input.event));
      }
      if (input.status) {
        filters.push(eq(financeAutoEntryRules.status, input.status));
      }
      if (!input.includeArchived) {
        filters.push(
          sql`${financeAutoEntryRules.metadata} ->> 'archivedAt' IS NULL`,
        );
      }
      if (input.sellerUserId !== undefined) {
        filters.push(
          input.sellerUserId === null
            ? isNull(financeAutoEntryRules.sellerUserId)
            : eq(financeAutoEntryRules.sellerUserId, input.sellerUserId),
        );
      }
      const rows = await db
        .select()
        .from(financeAutoEntryRules)
        .where(and(...filters))
        .orderBy(
          desc(financeAutoEntryRules.priority),
          desc(financeAutoEntryRules.updatedAt),
          asc(financeAutoEntryRules.id),
        )
        .limit(input.limit);
      return rows.map(toFinanceAutoEntryRule);
    },
    async updateRule(input) {
      const scope = requireAutoEntryScope(input);
      const [row] = await db
        .update(financeAutoEntryRules)
        .set(toUpdateFinanceAutoEntryRule(input))
        .where(
          and(
            eq(financeAutoEntryRules.id, input.ruleId),
            eq(financeAutoEntryRules.storeId, scope.storeId),
            eq(financeAutoEntryRules.tenantId, scope.tenantId),
          ),
        )
        .returning();
      if (!row) {
        throw new FinanceAutoEntryRuleDrizzleNotFoundError(input.ruleId);
      }
      return toFinanceAutoEntryRule(row);
    },
  };
}

function requireAutoEntryScope(input: {
  storeId: string | null;
  tenantId: string | null;
}): { storeId: string; tenantId: string } {
  if (!input.storeId) throw new FinanceAutoEntryDrizzleScopeError("storeId");
  if (!input.tenantId) throw new FinanceAutoEntryDrizzleScopeError("tenantId");
  return { storeId: input.storeId, tenantId: input.tenantId };
}

export class FinanceAutoEntryDrizzleScopeError extends Error {
  constructor(fieldName: string) {
    super(`Finance auto-entry drizzle repository requires ${fieldName}.`);
    this.name = "FinanceAutoEntryDrizzleScopeError";
  }
}

export class FinanceAutoEntryRuleDrizzleNotFoundError extends Error {
  constructor(ruleId: string) {
    super(`Finance auto-entry rule not found: ${ruleId}`);
    this.name = "FinanceAutoEntryRuleDrizzleNotFoundError";
  }
}
