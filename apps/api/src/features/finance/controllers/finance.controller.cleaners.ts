import type { z } from "zod";
import type { FinanceAutoEntryRuleConditions } from "@lojaveiculosv2/shared";
import type {
  attachFinanceDocumentSchema,
  createCommissionRuleSchema,
  createFinanceAutoEntryRuleSchema,
  createFinanceEntrySchema,
  createRecurringEntrySchema,
  listCommissionRulesQuerySchema,
  listFinanceAutoEntryRulesQuerySchema,
  listFinanceEntriesQuerySchema,
  listRecurringEntriesQuerySchema,
  updateFinanceEntrySchema,
  updateFinanceAutoEntryRuleSchema,
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
    ...(input.documentUpload
      ? { documentUpload: cleanDocumentUpload(input.documentUpload) }
      : {}),
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
    ...(input.links !== undefined ? { links: input.links } : {}),
    ...(input.metadata !== undefined ? { metadata: input.metadata } : {}),
    ...(input.name !== undefined ? { name: input.name } : {}),
    ...(input.paidAt !== undefined ? { paidAt: input.paidAt } : {}),
    ...(input.sellerUserId !== undefined
      ? { sellerUserId: input.sellerUserId }
      : {}),
    ...(input.status !== undefined ? { status: input.status } : {}),
  };
}

function cleanDocumentUpload(
  input: z.infer<typeof createFinanceEntrySchema>["documentUpload"],
) {
  if (!input) return input;
  return {
    contentType: input.contentType,
    fileName: input.fileName,
    kind: input.kind,
    ...(input.linkRole !== undefined ? { linkRole: input.linkRole } : {}),
    metadata: input.metadata,
    sizeBytes: input.sizeBytes,
    ...(input.title !== undefined ? { title: input.title } : {}),
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

export function cleanListFinanceAutoEntryRulesQuery(
  input: z.infer<typeof listFinanceAutoEntryRulesQuerySchema>,
) {
  return {
    ...(input.event !== undefined ? { event: input.event } : {}),
    ...(input.limit !== undefined ? { limit: input.limit } : {}),
    ...(input.sellerUserId !== undefined
      ? { sellerUserId: input.sellerUserId }
      : {}),
    ...(input.status !== undefined ? { status: input.status } : {}),
  };
}

export function cleanCreateFinanceAutoEntryRuleInput(
  input: z.infer<typeof createFinanceAutoEntryRuleSchema>,
) {
  return {
    calculation: input.calculation,
    category: input.category,
    conditions: cleanAutoEntryConditions(input.conditions),
    event: input.event,
    family: input.family,
    metadata: input.metadata,
    name: input.name,
    outputType: input.outputType,
    priority: input.priority,
    recipient: input.recipient,
    resolution: input.resolution,
    ruleKey: input.ruleKey,
    sellerUserId: input.sellerUserId,
    status: input.status,
    timing: input.timing,
  };
}

export function cleanUpdateFinanceAutoEntryRuleInput(
  ruleId: string,
  input: z.infer<typeof updateFinanceAutoEntryRuleSchema>,
) {
  return {
    ruleId,
    ...(input.calculation !== undefined
      ? { calculation: input.calculation }
      : {}),
    ...(input.category !== undefined ? { category: input.category } : {}),
    ...(input.conditions !== undefined
      ? { conditions: cleanAutoEntryConditions(input.conditions) }
      : {}),
    ...(input.event !== undefined ? { event: input.event } : {}),
    ...(input.family !== undefined ? { family: input.family } : {}),
    ...(input.metadata !== undefined ? { metadata: input.metadata } : {}),
    ...(input.name !== undefined ? { name: input.name } : {}),
    ...(input.outputType !== undefined ? { outputType: input.outputType } : {}),
    ...(input.priority !== undefined ? { priority: input.priority } : {}),
    ...(input.recipient !== undefined ? { recipient: input.recipient } : {}),
    ...(input.resolution !== undefined ? { resolution: input.resolution } : {}),
    ...(input.ruleKey !== undefined ? { ruleKey: input.ruleKey } : {}),
    ...(input.sellerUserId !== undefined
      ? { sellerUserId: input.sellerUserId }
      : {}),
    ...(input.status !== undefined ? { status: input.status } : {}),
    ...(input.timing !== undefined ? { timing: input.timing } : {}),
  };
}

function cleanAutoEntryConditions(
  input: z.infer<typeof createFinanceAutoEntryRuleSchema>["conditions"],
): FinanceAutoEntryRuleConditions {
  const conditions: FinanceAutoEntryRuleConditions = {};
  if (input.financingRank !== undefined) {
    conditions.financingRank = input.financingRank;
  }
  if (input.standardCommissionEnabled !== undefined) {
    conditions.standardCommissionEnabled = input.standardCommissionEnabled;
  }
  if (input.transferHasLien !== undefined) {
    conditions.transferHasLien = input.transferHasLien;
  }
  if (input.basisRange !== undefined) {
    conditions.basisRange = {
      basis: input.basisRange.basis,
      ...(input.basisRange.maxCents !== undefined
        ? { maxCents: input.basisRange.maxCents }
        : {}),
      ...(input.basisRange.minCents !== undefined
        ? { minCents: input.basisRange.minCents }
        : {}),
    };
  }
  return conditions;
}
