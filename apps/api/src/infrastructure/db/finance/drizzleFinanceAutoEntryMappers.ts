import type { InferInsertModel, InferSelectModel } from "drizzle-orm";
import type {
  financeAutoEntryExecutions,
  financeAutoEntryRules,
} from "@lojaveiculosv2/db";
import type { FinanceAutoEntryRecipient } from "@lojaveiculosv2/shared";
import type {
  CreateFinanceAutoEntryExecutionInput,
  CreateFinanceAutoEntryRuleInput,
  FinanceAutoEntryExecution,
  FinanceAutoEntryRule,
  UpdateFinanceAutoEntryRuleInput,
} from "../../../domains/finance/ports/financeAutoEntryRepository.js";

export type AutoEntryRuleRow = InferSelectModel<typeof financeAutoEntryRules>;
export type InsertAutoEntryRuleRow = InferInsertModel<
  typeof financeAutoEntryRules
>;
export type UpdateAutoEntryRuleRow = Partial<InsertAutoEntryRuleRow>;
export type AutoEntryExecutionRow = InferSelectModel<
  typeof financeAutoEntryExecutions
>;
export type InsertAutoEntryExecutionRow = InferInsertModel<
  typeof financeAutoEntryExecutions
>;

export function toFinanceAutoEntryRule(
  row: AutoEntryRuleRow,
): FinanceAutoEntryRule {
  return {
    calculation: row.calculation,
    category: row.category,
    conditions: row.conditions,
    createdAt: row.createdAt,
    event: row.event,
    family: row.family,
    id: row.id,
    metadata: row.metadata as Record<string, unknown>,
    name: row.name,
    outputType: row.outputType,
    priority: row.priority,
    recipient: toFinanceAutoEntryRecipient(row),
    resolution: row.resolution,
    ruleKey: row.ruleKey,
    sellerUserId: row.sellerUserId,
    status: row.status,
    storeId: row.storeId,
    tenantId: row.tenantId,
    timing: row.timing,
    updatedAt: row.updatedAt,
  };
}

export function toInsertFinanceAutoEntryRule(
  input: CreateFinanceAutoEntryRuleInput,
): InsertAutoEntryRuleRow {
  return {
    calculation: input.calculation,
    category: input.category,
    conditions: input.conditions,
    event: input.event,
    family: input.family,
    metadata: input.metadata,
    name: input.name,
    outputType: input.outputType,
    priority: input.priority,
    recipientKind: input.recipient.kind,
    recipientUserId:
      input.recipient.kind === "fixed_user" ? input.recipient.userId : null,
    resolution: input.resolution,
    ruleKey: input.ruleKey,
    sellerUserId: input.sellerUserId,
    status: input.status,
    storeId: input.storeId,
    tenantId: input.tenantId,
    timing: input.timing,
  };
}

export function toUpdateFinanceAutoEntryRule(
  input: UpdateFinanceAutoEntryRuleInput,
): UpdateAutoEntryRuleRow {
  return {
    ...(input.calculation !== undefined
      ? { calculation: input.calculation }
      : {}),
    ...(input.category !== undefined ? { category: input.category } : {}),
    ...(input.conditions !== undefined ? { conditions: input.conditions } : {}),
    ...(input.event !== undefined ? { event: input.event } : {}),
    ...(input.family !== undefined ? { family: input.family } : {}),
    ...(input.metadata !== undefined ? { metadata: input.metadata } : {}),
    ...(input.name !== undefined ? { name: input.name } : {}),
    ...(input.outputType !== undefined ? { outputType: input.outputType } : {}),
    ...(input.priority !== undefined ? { priority: input.priority } : {}),
    ...(input.recipient !== undefined
      ? {
          recipientKind: input.recipient.kind,
          recipientUserId:
            input.recipient.kind === "fixed_user"
              ? input.recipient.userId
              : null,
        }
      : {}),
    ...(input.resolution !== undefined ? { resolution: input.resolution } : {}),
    ...(input.ruleKey !== undefined ? { ruleKey: input.ruleKey } : {}),
    ...(input.sellerUserId !== undefined
      ? { sellerUserId: input.sellerUserId }
      : {}),
    ...(input.status !== undefined ? { status: input.status } : {}),
    ...(input.timing !== undefined ? { timing: input.timing } : {}),
    updatedAt: new Date(),
  };
}

function toFinanceAutoEntryRecipient(
  row: Pick<AutoEntryRuleRow, "recipientKind" | "recipientUserId">,
): FinanceAutoEntryRecipient {
  if (row.recipientKind === "fixed_user") {
    if (!row.recipientUserId) {
      throw new Error(
        "Finance auto-entry fixed_user recipient is missing recipientUserId.",
      );
    }
    return { kind: "fixed_user", userId: row.recipientUserId };
  }
  return { kind: row.recipientKind };
}

export function toFinanceAutoEntryExecution(
  row: AutoEntryExecutionRow,
): FinanceAutoEntryExecution {
  return {
    calculationSnapshot: row.calculationSnapshot,
    createdAt: row.createdAt,
    financeEntryId: row.financeEntryId,
    id: row.id,
    metadata: row.metadata as Record<string, unknown>,
    ruleId: row.ruleId,
    sourceId: row.sourceId,
    sourceRevision: row.sourceRevision,
    sourceType: row.sourceType,
    storeId: row.storeId,
    tenantId: row.tenantId,
    updatedAt: row.updatedAt,
  };
}

export function toInsertFinanceAutoEntryExecution(
  input: CreateFinanceAutoEntryExecutionInput,
): InsertAutoEntryExecutionRow {
  return {
    calculationSnapshot: input.calculationSnapshot,
    financeEntryId: input.financeEntryId,
    metadata: input.metadata,
    ruleId: input.ruleId,
    sourceId: input.sourceId,
    sourceRevision: input.sourceRevision,
    sourceType: input.sourceType,
    storeId: input.storeId,
    tenantId: input.tenantId,
  };
}
