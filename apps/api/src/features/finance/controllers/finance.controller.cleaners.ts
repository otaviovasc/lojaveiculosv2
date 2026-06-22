import type { z } from "zod";
import type {
  attachFinanceDocumentSchema,
  createCommissionRuleSchema,
  createFinanceEntrySchema,
  createRecurringEntrySchema,
  listCommissionRulesQuerySchema,
  listFinanceEntriesQuerySchema,
  listRecurringEntriesQuerySchema,
  updateFinanceEntrySchema,
} from "./finance.controller.schemas.js";

export function cleanListQuery(
  input: z.infer<typeof listFinanceEntriesQuerySchema>,
) {
  return {
    ...(input.limit !== undefined ? { limit: input.limit } : {}),
    ...(input.offset !== undefined ? { offset: input.offset } : {}),
    ...(input.status !== undefined ? { status: input.status } : {}),
    ...(input.targetId !== undefined ? { targetId: input.targetId } : {}),
    ...(input.targetType !== undefined ? { targetType: input.targetType } : {}),
    ...(input.type !== undefined ? { type: input.type } : {}),
  };
}

export function cleanCreateEntryInput(
  input: z.infer<typeof createFinanceEntrySchema>,
) {
  return {
    amountCents: input.amountCents,
    category: input.category,
    dueAt: input.dueAt ?? null,
    links: input.links,
    metadata: input.metadata,
    name: input.name,
    paidAt: input.paidAt ?? null,
    sellerUserId: input.sellerUserId ?? null,
    status: input.status,
    type: input.type,
  };
}

export function cleanAttachDocumentInput(
  entryId: string,
  input: z.infer<typeof attachFinanceDocumentSchema>,
) {
  return {
    entryId,
    fileName: input.fileName,
    fileSizeBytes: input.fileSizeBytes ?? null,
    kind: input.kind,
    ...(input.linkRole !== undefined ? { linkRole: input.linkRole } : {}),
    mimeType: input.mimeType ?? null,
    storageKey: input.storageKey,
    title: input.title,
  };
}

export function cleanUpdateEntryInput(
  entryId: string,
  input: z.infer<typeof updateFinanceEntrySchema>,
) {
  return {
    entryId,
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
  };
}

export function cleanListRecurringQuery(
  input: z.infer<typeof listRecurringEntriesQuerySchema>,
) {
  return {
    ...(input.limit !== undefined ? { limit: input.limit } : {}),
    ...(input.type !== undefined ? { type: input.type } : {}),
  };
}

export function cleanCreateRecurringInput(
  input: z.infer<typeof createRecurringEntrySchema>,
) {
  return {
    amountCents: input.amountCents,
    category: input.category,
    dayOfMonth: input.dayOfMonth ?? null,
    frequency: input.frequency,
    metadata: input.metadata,
    name: input.name,
    nextDueAt: input.nextDueAt,
    sellerUserId: input.sellerUserId ?? null,
    status: input.status,
    type: input.type,
  };
}

export function cleanListCommissionRulesQuery(
  input: z.infer<typeof listCommissionRulesQuerySchema>,
) {
  return {
    ...(input.limit !== undefined ? { limit: input.limit } : {}),
    ...(input.sellerUserId !== undefined
      ? { sellerUserId: input.sellerUserId }
      : {}),
    ...(input.status !== undefined ? { status: input.status } : {}),
  };
}

export function cleanCreateCommissionRuleInput(
  input: z.infer<typeof createCommissionRuleSchema>,
) {
  return {
    category: input.category,
    fixedAmountCents: input.fixedAmountCents ?? null,
    metadata: input.metadata,
    name: input.name,
    percentageBasisPoints: input.percentageBasisPoints ?? null,
    sellerUserId: input.sellerUserId ?? null,
    status: input.status,
    type: input.type,
  };
}
