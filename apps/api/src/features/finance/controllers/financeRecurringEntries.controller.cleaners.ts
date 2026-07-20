import type { z } from "zod";
import type {
  createRecurringEntrySchema,
  listRecurringEntriesQuerySchema,
  updateRecurringEntrySchema,
} from "./finance.controller.schemas.js";

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

export function cleanUpdateRecurringInput(
  recurringEntryId: string,
  input: z.infer<typeof updateRecurringEntrySchema>,
) {
  return {
    recurringEntryId,
    ...(input.amountCents !== undefined
      ? { amountCents: input.amountCents }
      : {}),
    ...(input.category !== undefined ? { category: input.category } : {}),
    ...(input.dayOfMonth !== undefined ? { dayOfMonth: input.dayOfMonth } : {}),
    ...(input.frequency !== undefined ? { frequency: input.frequency } : {}),
    ...(input.metadata !== undefined ? { metadata: input.metadata } : {}),
    ...(input.name !== undefined ? { name: input.name } : {}),
    ...(input.nextDueAt !== undefined ? { nextDueAt: input.nextDueAt } : {}),
    ...(input.sellerUserId !== undefined
      ? { sellerUserId: input.sellerUserId }
      : {}),
  };
}
