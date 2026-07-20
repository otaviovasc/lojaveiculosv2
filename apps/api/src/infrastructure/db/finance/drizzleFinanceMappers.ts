import type { InferInsertModel, InferSelectModel } from "drizzle-orm";
import type {
  commissionRules,
  financeEntries,
  financeEntryLinks,
  financeRecurringEntries,
} from "@lojaveiculosv2/db";
import type {
  CommissionRule,
  CreateCommissionRuleInput,
  CreateFinanceEntryInput,
  CreateFinanceRecurringEntryInput,
  FinanceEntry,
  FinanceEntryLink,
  FinanceRecurringEntry,
  UpdateFinanceEntryInput,
  UpdateFinanceRecurringEntryInput,
} from "../../../domains/finance/ports/financeRepository.js";

export type EntryRow = InferSelectModel<typeof financeEntries>;
export type InsertEntryRow = InferInsertModel<typeof financeEntries>;
export type UpdateEntryRow = Partial<InsertEntryRow>;
export type LinkRow = InferSelectModel<typeof financeEntryLinks>;
export type InsertLinkRow = InferInsertModel<typeof financeEntryLinks>;
export type RecurringRow = InferSelectModel<typeof financeRecurringEntries>;
export type InsertRecurringRow = InferInsertModel<
  typeof financeRecurringEntries
>;
export type UpdateRecurringRow = Partial<InsertRecurringRow>;
export type RuleRow = InferSelectModel<typeof commissionRules>;
export type InsertRuleRow = InferInsertModel<typeof commissionRules>;

export function toInsertEntry(input: CreateFinanceEntryInput): InsertEntryRow {
  return {
    amountCents: input.amountCents,
    category: input.category,
    dueAt: input.dueAt,
    metadata: input.metadata,
    name: input.name,
    paidAt: input.paidAt,
    sellerUserId: input.sellerUserId,
    status: input.status,
    storeId: input.storeId,
    tenantId: input.tenantId,
    type: input.type,
  };
}

export function toInsertLink(
  input: { storeId: string; tenantId: string },
  entryId: string,
  link: CreateFinanceEntryInput["links"][number],
): InsertLinkRow {
  return {
    entryId,
    storeId: input.storeId,
    targetId: link.targetId,
    targetType: link.targetType,
    tenantId: input.tenantId,
  };
}

export function toUpdateEntry(input: UpdateFinanceEntryInput): UpdateEntryRow {
  return {
    ...(input.amountCents !== undefined
      ? { amountCents: input.amountCents }
      : {}),
    ...(input.category !== undefined ? { category: input.category } : {}),
    ...(input.dueAt !== undefined ? { dueAt: input.dueAt } : {}),
    ...(input.metadata !== undefined ? { metadata: input.metadata } : {}),
    ...(input.name !== undefined ? { name: input.name } : {}),
    ...(input.paidAt !== undefined ? { paidAt: input.paidAt } : {}),
    ...(input.sellerUserId !== undefined
      ? { sellerUserId: input.sellerUserId }
      : {}),
    ...(input.status !== undefined ? { status: input.status } : {}),
    updatedAt: new Date(),
  };
}

export function toInsertRecurringEntry(
  input: CreateFinanceRecurringEntryInput,
): InsertRecurringRow {
  return {
    amountCents: input.amountCents,
    category: input.category,
    dayOfMonth: input.dayOfMonth,
    frequency: input.frequency,
    metadata: input.metadata,
    name: input.name,
    nextDueAt: input.nextDueAt,
    sellerUserId: input.sellerUserId,
    status: input.status,
    storeId: input.storeId,
    tenantId: input.tenantId,
    type: input.type,
  };
}

export function toUpdateRecurringEntry(
  input: UpdateFinanceRecurringEntryInput,
): UpdateRecurringRow {
  return {
    ...(input.amountCents !== undefined
      ? { amountCents: input.amountCents }
      : {}),
    ...(input.category !== undefined ? { category: input.category } : {}),
    ...(input.dayOfMonth !== undefined ? { dayOfMonth: input.dayOfMonth } : {}),
    ...(input.frequency !== undefined ? { frequency: input.frequency } : {}),
    ...(input.lastGeneratedAt !== undefined
      ? { lastGeneratedAt: input.lastGeneratedAt }
      : {}),
    ...(input.metadata !== undefined ? { metadata: input.metadata } : {}),
    ...(input.name !== undefined ? { name: input.name } : {}),
    ...(input.nextDueAt !== undefined ? { nextDueAt: input.nextDueAt } : {}),
    ...(input.sellerUserId !== undefined
      ? { sellerUserId: input.sellerUserId }
      : {}),
    ...(input.status !== undefined ? { status: input.status } : {}),
    updatedAt: new Date(),
  };
}

export function toInsertCommissionRule(
  input: CreateCommissionRuleInput,
): InsertRuleRow {
  return {
    category: input.category,
    fixedAmountCents: input.fixedAmountCents,
    metadata: input.metadata,
    name: input.name,
    percentageBasisPoints: input.percentageBasisPoints,
    sellerUserId: input.sellerUserId,
    status: input.status,
    storeId: input.storeId,
    tenantId: input.tenantId,
    type: input.type,
  };
}

export function toEntry(row: EntryRow): FinanceEntry {
  return {
    amountCents: row.amountCents,
    category: row.category,
    createdAt: row.createdAt,
    dueAt: row.dueAt,
    id: row.id,
    metadata: row.metadata as Record<string, unknown>,
    name: row.name,
    paidAt: row.paidAt,
    sellerUserId: row.sellerUserId,
    status: row.status,
    storeId: row.storeId,
    tenantId: row.tenantId,
    type: row.type,
    updatedAt: row.updatedAt,
  };
}

export function toLink(row: LinkRow): FinanceEntryLink {
  return {
    createdAt: row.createdAt,
    entryId: row.entryId,
    id: row.id,
    storeId: row.storeId,
    targetId: row.targetId,
    targetType: row.targetType,
    tenantId: row.tenantId,
    updatedAt: row.updatedAt,
  };
}

export function toRecurringEntry(row: RecurringRow): FinanceRecurringEntry {
  return {
    amountCents: row.amountCents,
    category: row.category,
    createdAt: row.createdAt,
    dayOfMonth: row.dayOfMonth,
    frequency: row.frequency,
    id: row.id,
    lastGeneratedAt: row.lastGeneratedAt,
    metadata: row.metadata as Record<string, unknown>,
    name: row.name,
    nextDueAt: row.nextDueAt,
    sellerUserId: row.sellerUserId,
    status: row.status,
    storeId: row.storeId,
    tenantId: row.tenantId,
    type: row.type,
    updatedAt: row.updatedAt,
  };
}

export function toCommissionRule(row: RuleRow): CommissionRule {
  return {
    category: row.category,
    createdAt: row.createdAt,
    fixedAmountCents: row.fixedAmountCents,
    id: row.id,
    metadata: row.metadata as Record<string, unknown>,
    name: row.name,
    percentageBasisPoints: row.percentageBasisPoints,
    sellerUserId: row.sellerUserId,
    status: row.status,
    storeId: row.storeId,
    tenantId: row.tenantId,
    type: row.type,
    updatedAt: row.updatedAt,
  };
}
