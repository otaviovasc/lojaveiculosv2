import { z } from "zod";

export const whatsappConnectionStatusSchema = z.enum([
  "active",
  "archived",
  "disconnected",
  "error",
  "paused",
  "sandbox",
]);

export const whatsappCreateConnectionSchema = z
  .object({
    displayName: z.string().trim().min(1).max(160).optional(),
    provider: z.literal("composio_whatsapp"),
  })
  .strict();

export const whatsappZapiPairingCodeSchema = z
  .object({ phone: z.string().trim().min(8).max(30) })
  .strict();

export const whatsappComposioSenderSchema = z
  .object({ senderId: z.string().trim().min(1).max(191) })
  .strict();

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
    displayName: z.string().trim().min(1).max(120).optional(),
    purpose: z.string().trim().max(160).nullable().optional(),
  })
  .strict()
  .refine((input) => Object.keys(input).length > 0, {
    message: "At least one connection field is required.",
  });

export const whatsappZapiSupportScopeSchema = z
  .object({
    storeId: z.string().uuid(),
    tenantId: z.string().uuid(),
  })
  .strict();

export const whatsappZapiSupportCredentialsSchema = z
  .object({
    displayName: z.string().trim().min(1).max(160).optional(),
    instanceId: z.string().trim().min(1).max(191),
    instanceToken: z.string().trim().min(1).max(500),
    storeId: z.string().uuid(),
    tenantId: z.string().uuid(),
  })
  .strict();

export const whatsappZapiSupportPairingCodeSchema = z
  .object({
    phone: z.string().trim().min(8).max(30),
    storeId: z.string().uuid(),
    tenantId: z.string().uuid(),
  })
  .strict();
