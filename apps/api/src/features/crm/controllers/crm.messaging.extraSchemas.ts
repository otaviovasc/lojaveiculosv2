import { z } from "zod";

export const crmQuickMessageKindSchema = z.enum(["AUDIO", "IMAGE", "TEXT"]);

export const crmCreateQuickMessageSchema = z.object({
  content: z.string().trim().max(4000).optional(),
  kind: crmQuickMessageKindSchema.default("TEXT"),
  mediaBase64: z.string().trim().max(30_000_000).optional(),
  mediaFileName: z.string().trim().max(191).optional(),
  mediaType: z.string().trim().max(120).optional(),
  shortcut: z.string().trim().min(1).max(50),
  title: z.string().trim().min(1).max(160),
});

export const crmUpdateQuickMessageSchema = z.object({
  content: z.string().trim().max(4000).optional(),
  kind: crmQuickMessageKindSchema.optional(),
  mediaBase64: z.string().trim().max(30_000_000).optional(),
  mediaFileName: z.string().trim().max(191).optional(),
  mediaType: z.string().trim().max(120).optional(),
  shortcut: z.string().trim().min(1).max(50).optional(),
  title: z.string().trim().min(1).max(160).optional(),
});

export const whatsappSendLocationSchema = z.object({
  address: z.string().trim().max(240).optional(),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  name: z.string().trim().max(120).optional(),
  cycleId: z.string().uuid(),
  url: z.string().url().max(500).optional(),
});

export const whatsappSendCatalogSchema = z.object({
  catalogDescription: z.string().trim().max(240).optional(),
  catalogPhone: z.string().trim().min(8).max(32).optional(),
  catalogUrl: z.string().url().max(500).optional(),
  message: z.string().trim().max(1000).optional(),
  cycleId: z.string().uuid(),
  title: z.string().trim().max(120).optional(),
});

export const whatsappCatalogProductsQuerySchema = z.object({
  catalogPhone: z.string().trim().min(8).max(32).optional(),
  nextCursor: z.string().trim().max(500).optional(),
  cycleId: z.string().uuid(),
});

export const whatsappSendCatalogProductSchema = z.object({
  catalogPhone: z.string().trim().min(8).max(32).optional(),
  productId: z.string().trim().min(1).max(191),
  productName: z.string().trim().max(240).optional(),
  cycleId: z.string().uuid(),
});

export const whatsappSendVehicleSchema = z
  .object({
    description: z.string().trim().max(1000).optional(),
    listingId: z.string().uuid().optional(),
    mediaLimit: z.number().int().min(0).max(10).optional(),
    mileageLabel: z.string().trim().max(80).optional(),
    priceLabel: z.string().trim().max(80).optional(),
    cycleId: z.string().uuid(),
    thumbnailUrl: z.string().url().max(500).optional(),
    title: z.string().trim().max(160).optional(),
    unitId: z.string().uuid().optional(),
    url: z.string().url().max(500).optional(),
    year: z.string().trim().max(40).optional(),
  })
  .refine((input) => input.title || input.listingId || input.unitId, {
    message: "title, listingId, or unitId is required.",
  });

const crmCommandIdSchema = z.string().uuid();

export const crmConversationCycleCommandSchema = z
  .object({ commandId: crmCommandIdSchema })
  .strict();

export const crmAssignConversationCycleSchema = z
  .object({
    assignedUserId: z.string().uuid().nullable(),
    commandId: crmCommandIdSchema,
  })
  .strict();

export const crmSetConversationAttendanceSchema = z
  .object({
    enabled: z.boolean(),
    commandId: crmCommandIdSchema,
  })
  .strict();
