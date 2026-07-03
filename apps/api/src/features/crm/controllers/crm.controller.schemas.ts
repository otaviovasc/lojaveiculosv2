import { z } from "zod";

export {
  whatsappMessagesQuerySchema,
  whatsappSessionCountsQuerySchema,
  whatsappSessionFilterSchema,
  whatsappSessionsQuerySchema,
  whatsappSessionStatusSchema,
} from "./crm.whatsapp.querySchemas.js";

export const leadStatusSchema = z.enum([
  "new",
  "contacted",
  "qualified",
  "negotiating",
  "won",
  "lost",
  "archived",
]);

export const leadSourceSchema = z.enum([
  "public_site",
  "crm",
  "external_api",
  "manual",
  "olx",
  "whatsapp",
  "other",
]);

export const leadActivityTypeSchema = z.enum([
  "note",
  "call",
  "whatsapp",
  "email",
  "status_change",
  "task",
]);

export const leadActivityDirectionSchema = z.enum([
  "inbound",
  "outbound",
  "internal",
]);

export const listLeadsQuerySchema = z.object({
  listingId: z.string().uuid().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  offset: z.coerce.number().int().min(0).default(0),
  search: z.string().trim().max(120).optional(),
  source: leadSourceSchema.optional(),
  status: leadStatusSchema.optional(),
});

export const createLeadSchema = z.object({
  assignedUserId: z.string().uuid().nullable().optional(),
  buyerEmail: z.string().email().nullable().optional(),
  buyerName: z.string().trim().min(1).max(191).nullable().optional(),
  buyerPhone: z.string().trim().min(3).max(40).nullable().optional(),
  listingId: z.string().uuid().nullable().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
  source: leadSourceSchema.default("manual"),
});

export const updateLeadSchema = z.object({
  assignedUserId: z.string().uuid().nullable().optional(),
  buyerEmail: z.string().email().nullable().optional(),
  buyerName: z.string().trim().min(1).max(191).nullable().optional(),
  buyerPhone: z.string().trim().min(3).max(40).nullable().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
  status: leadStatusSchema.optional(),
});

export const listActivitiesQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(50),
});

export const createActivitySchema = z.object({
  activityType: leadActivityTypeSchema.default("note"),
  content: z.string().trim().min(1).max(2000),
  direction: leadActivityDirectionSchema.default("internal"),
  metadata: z.record(z.string(), z.unknown()).optional(),
  occurredAt: z.string().datetime().optional(),
  priority: z.number().int().min(0).max(5).optional(),
});

export const whatsappSendTextSchema = z.object({
  replyToMessageId: z.string().uuid().optional(),
  sessionId: z.string().uuid(),
  text: z.string().trim().min(1).max(4000),
});

export const whatsappStartConversationSchema = z.object({
  buyerName: z.string().trim().min(1).max(191).optional(),
  connectionId: z.string().uuid(),
  phone: z.string().trim().min(8).max(40),
  text: z.string().trim().min(1).max(4000),
});

export const whatsappMessageParamSchema = z.object({
  messageId: z.string().uuid(),
});

export const whatsappSendReactionSchema = z.object({
  reaction: z.string().trim().min(1).max(16),
});

export const whatsappSendMediaSchema = z
  .object({
    base64: z.string().trim().min(1).max(140_000_000),
    caption: z.string().trim().max(1000).optional(),
    fileName: z.string().trim().max(191).optional(),
    mediaType: z.enum(["audio", "document", "image", "video"]),
    mimeType: z.string().trim().max(120).optional(),
    sessionId: z.string().uuid(),
  })
  .superRefine((input, context) => {
    if (input.mediaType === "document" && !input.fileName) {
      context.addIssue({
        code: "custom",
        message: "Document media requires fileName.",
        path: ["fileName"],
      });
    }
  });

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

export const whatsappAddSessionTagSchema = z.object({
  color: z
    .string()
    .trim()
    .regex(/^#[0-9a-fA-F]{6}$/)
    .optional(),
  emoji: z.string().trim().max(16).nullable().optional(),
  isColumn: z.boolean().optional(),
  name: z.string().trim().min(1).max(40),
});

export const whatsappAssignSessionSchema = z.object({
  assignedUserId: z.string().uuid().nullable(),
});

export const whatsappToggleInterventionSchema = z.object({
  enabled: z.boolean(),
});
