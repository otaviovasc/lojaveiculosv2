import { z } from "zod";

export const crmSpecialDateConnectionIdSchema = z.string().uuid();

export const crmSpecialDateTypeSchema = z.enum([
  "birthday",
  "purchaseAnniversary",
  "easter",
  "christmas",
  "mothersDay",
  "fathersDay",
  "blackFriday",
]);

export const crmUpdateSpecialDateConfigSchema = z
  .object({
    enabled: z.boolean(),
    leadDays: z.number().int().min(0).max(30),
    messageTemplate: z.string().trim().min(1).max(1_000),
    sendTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/u),
  })
  .strict();
