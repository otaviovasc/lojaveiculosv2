import { z } from "zod";

export const whatsappQuickMessageKindSchema = z.enum([
  "AUDIO",
  "IMAGE",
  "TEXT",
]);

export const whatsappCreateQuickMessageSchema = z.object({
  content: z.string().trim().max(4000).optional(),
  kind: whatsappQuickMessageKindSchema.default("TEXT"),
  mediaBase64: z.string().trim().max(30_000_000).optional(),
  mediaFileName: z.string().trim().max(191).optional(),
  mediaType: z.string().trim().max(120).optional(),
  shortcut: z.string().trim().min(1).max(50),
  title: z.string().trim().min(1).max(160),
});

export const whatsappUpdateQuickMessageSchema = z.object({
  content: z.string().trim().max(4000).optional(),
  kind: whatsappQuickMessageKindSchema.optional(),
  mediaBase64: z.string().trim().max(30_000_000).optional(),
  mediaFileName: z.string().trim().max(191).optional(),
  mediaType: z.string().trim().max(120).optional(),
  shortcut: z.string().trim().min(1).max(50).optional(),
  title: z.string().trim().min(1).max(160).optional(),
});

export const whatsappSendQuickMessageSchema = z.object({
  sessionId: z.string().uuid(),
});

export const whatsappSendLocationSchema = z.object({
  address: z.string().trim().max(240).optional(),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  name: z.string().trim().max(120).optional(),
  sessionId: z.string().uuid(),
  url: z.string().url().max(500).optional(),
});

export const whatsappSendCatalogSchema = z.object({
  catalogDescription: z.string().trim().max(240).optional(),
  catalogPhone: z.string().trim().min(8).max(32).optional(),
  catalogUrl: z.string().url().max(500).optional(),
  message: z.string().trim().max(1000).optional(),
  sessionId: z.string().uuid(),
  title: z.string().trim().max(120).optional(),
});

export const whatsappCatalogProductsQuerySchema = z.object({
  catalogPhone: z.string().trim().min(8).max(32).optional(),
  nextCursor: z.string().trim().max(500).optional(),
  sessionId: z.string().uuid(),
});

export const whatsappTagsQuerySchema = z.object({
  connectionId: z.string().uuid().nullable().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(100),
  search: z.string().trim().max(80).optional(),
});

const whatsappTagColorSchema = z
  .string()
  .trim()
  .regex(/^#[0-9a-fA-F]{6}$/);

export const whatsappCreateTagSchema = z
  .object({
    color: whatsappTagColorSchema.optional(),
    connectionId: z.string().uuid().nullable().optional(),
    emoji: z.string().trim().max(16).nullable().optional(),
    name: z.string().trim().min(1).max(40),
  })
  .strict();

export const whatsappUpdateTagSchema = z
  .object({
    color: whatsappTagColorSchema.optional(),
    emoji: z.string().trim().max(16).nullable().optional(),
    name: z.string().trim().min(1).max(40).optional(),
    sortOrder: z.number().int().min(0).optional(),
  })
  .strict()
  .refine((input) => Object.keys(input).length > 0, {
    message: "At least one tag field is required.",
  });

export const whatsappReorderTagsSchema = z
  .object({ tagIds: z.array(z.string().uuid()).min(1) })
  .strict();

export const whatsappSendCatalogProductSchema = z.object({
  catalogPhone: z.string().trim().min(8).max(32).optional(),
  productId: z.string().trim().min(1).max(191),
  productName: z.string().trim().max(240).optional(),
  sessionId: z.string().uuid(),
});

export const whatsappSendVehicleSchema = z
  .object({
    description: z.string().trim().max(1000).optional(),
    listingId: z.string().uuid().optional(),
    mediaLimit: z.number().int().min(0).max(10).optional(),
    mileageLabel: z.string().trim().max(80).optional(),
    priceLabel: z.string().trim().max(80).optional(),
    sessionId: z.string().uuid(),
    thumbnailUrl: z.string().url().max(500).optional(),
    title: z.string().trim().max(160).optional(),
    unitId: z.string().uuid().optional(),
    url: z.string().url().max(500).optional(),
    year: z.string().trim().max(40).optional(),
  })
  .refine((input) => input.title || input.listingId || input.unitId, {
    message: "title, listingId, or unitId is required.",
  });

export const whatsappAddSessionTagSchema = z
  .object({
    color: whatsappTagColorSchema.optional(),
    emoji: z.string().trim().max(16).nullable().optional(),
    name: z.string().trim().min(1).max(40),
  })
  .strict();

export const whatsappAssignSessionSchema = z.object({
  assignedUserId: z.string().uuid().nullable(),
});

export const whatsappToggleInterventionSchema = z.object({
  enabled: z.boolean(),
});
