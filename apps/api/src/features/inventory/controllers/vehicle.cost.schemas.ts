import { z } from "zod";

export const costSchema = z.object({
  amountCents: z.number().int().positive(),
  costDate: z.coerce.date().optional(),
  description: z.string().trim().min(1).nullable().optional(),
  kind: z.enum([
    "acquisition",
    "fee",
    "other",
    "preparation",
    "repair",
    "tax",
    "transport",
  ]),
});

export const updateCostSchema = costSchema;

export const voidCostSchema = z.object({
  reason: z.string().trim().min(3).max(500),
});
