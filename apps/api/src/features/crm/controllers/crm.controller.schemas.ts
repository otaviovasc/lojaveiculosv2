import { z } from "zod";

export {
  whatsappMessagesQuerySchema,
  whatsappSessionCountsQuerySchema,
  whatsappSessionFilterSchema,
  whatsappSessionsQuerySchema,
  whatsappSessionStatusSchema,
} from "./crm.whatsapp.querySchemas.js";
export * from "./crm.whatsapp.schemas.js";

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
