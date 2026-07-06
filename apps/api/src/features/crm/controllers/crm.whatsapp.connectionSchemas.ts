import { z } from "zod";

export const whatsappConnectionStatusSchema = z.enum([
  "active",
  "archived",
  "disconnected",
  "error",
  "paused",
  "sandbox",
]);

export const whatsappScheduledMessageStatusSchema = z.enum([
  "cancelled",
  "failed",
  "pending",
  "sending",
  "sent",
]);

export const whatsappScheduledMessagesQuerySchema = z.object({
  connectionId: z.string().uuid().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  sessionId: z.string().uuid().optional(),
  status: whatsappScheduledMessageStatusSchema.optional(),
});

export const whatsappCreateScheduledMessageSchema = z
  .object({
    scheduledAt: z.string().datetime(),
    sessionId: z.string().uuid(),
    text: z.string().trim().min(1).max(4000),
  })
  .strict();

export const whatsappProcessDueScheduledMessagesSchema = z
  .object({
    dueAt: z.string().datetime().optional(),
    limit: z.number().int().min(1).max(100).optional(),
  })
  .strict();

export const whatsappUpdateConnectionSchema = z
  .object({
    catalogPhone: z.string().trim().min(8).max(32).nullable().optional(),
    connectedPhone: z.string().trim().min(8).max(32).nullable().optional(),
    credentialsEnv: z
      .object({
        apiBaseUrl: z.string().trim().min(1).max(120),
        clientToken: z.string().trim().min(1).max(120),
        instanceId: z.string().trim().min(1).max(120),
        instanceToken: z.string().trim().min(1).max(120),
      })
      .strict()
      .optional(),
    displayName: z.string().trim().min(1).max(120).optional(),
    externalConnectionId: z.string().trim().max(191).nullable().optional(),
    externalInstanceId: z.string().trim().max(191).nullable().optional(),
    phone: z.string().trim().min(8).max(40).nullable().optional(),
    purpose: z.string().trim().max(160).nullable().optional(),
    status: whatsappConnectionStatusSchema.optional(),
    webhookUrl: z.string().trim().url().max(500).nullable().optional(),
  })
  .strict()
  .refine((input) => Object.keys(input).length > 0, {
    message: "At least one connection field is required.",
  });
