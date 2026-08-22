import { financeAutoEntryMaxAmountCents } from "@lojaveiculosv2/shared";
import { z } from "zod";

export {
  crmMessagesQuerySchema,
  conversationCycleCountsQuerySchema,
  crmConversationCycleFilterSchema,
  conversationCyclesQuerySchema,
  crmConversationCycleStateSchema,
} from "./crm.conversationCycle.schemas.js";
export * from "./crm.channelConnections.schemas.js";
export * from "./crm.messaging.extraSchemas.js";
export * from "./crm.messaging.messageSchemas.js";

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
  "message",
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
  cursor: z.string().trim().min(1).max(512).optional(),
  listingId: z.string().uuid().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  offset: z.coerce.number().int().min(0).default(0),
  pipelineId: z.string().uuid().optional(),
  pipelineStageId: z.string().uuid().optional(),
  search: z.string().trim().max(120).optional(),
  source: leadSourceSchema.optional(),
  status: leadStatusSchema.optional(),
});

export const listLeadBoardQuerySchema = z.object({
  pipelineId: z.string().uuid(),
  search: z.string().trim().min(1).max(120).optional(),
  source: leadSourceSchema.optional(),
  stageLimit: z.coerce.number().int().min(1).max(100).default(20),
  status: leadStatusSchema.optional(),
});

export const crmStatisticsQuerySchema = z
  .object({
    connectionId: z.string().uuid().optional(),
    from: z.string().datetime(),
    toExclusive: z.string().datetime(),
  })
  .superRefine((value, context) => {
    const from = new Date(value.from);
    const toExclusive = new Date(value.toExclusive);
    if (from >= toExclusive) {
      context.addIssue({
        code: "custom",
        message: "from must precede toExclusive",
      });
    }
    if (toExclusive.getTime() - from.getTime() > 366 * 24 * 60 * 60 * 1_000) {
      context.addIssue({ code: "custom", message: "period exceeds 366 days" });
    }
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

export const pipelineStageStatusSchema = z.enum(["open", "won", "lost"]);

export const pipelineStageSchema = z.object({
  color: z.string().trim().min(1).max(16),
  id: z.string().uuid().optional(),
  isSystem: z.boolean().optional(),
  leadStatus: leadStatusSchema.optional(),
  name: z.string().trim().min(1).max(120),
  slaDays: z.number().int().min(0).max(365).nullable().optional(),
  sortOrder: z.number().int().min(0).optional(),
  status: pipelineStageStatusSchema,
});

export const createPipelineSchema = z.object({
  description: z.string().max(2000).optional(),
  isDefault: z.boolean().optional(),
  name: z.string().trim().min(1).max(120),
  rotationActive: z.boolean().optional(),
  stages: z.array(pipelineStageSchema).optional(),
});

export const updatePipelineSchema = createPipelineSchema.partial();

export const moveLeadPipelineStageSchema = z.object({
  pipelineStageId: z.string().uuid(),
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

const financialProductCommonFields = {
  idempotencyKey: z.string().uuid(),
  occurredAt: z.string().datetime().optional(),
  sellerUserId: z.string().uuid(),
} as const;

export const createLeadFinancialProductSchema = z.discriminatedUnion("type", [
  z.object({
    ...financialProductCommonFields,
    appliedCommissionBasisPoints: z
      .number()
      .int()
      .min(1_000)
      .max(2_000)
      .default(1_000),
    premiumCents: z
      .number()
      .int()
      .positive()
      .max(financeAutoEntryMaxAmountCents),
    type: z.literal("insurance"),
  }),
  z.object({
    ...financialProductCommonFields,
    creditLetterAmountCents: z
      .number()
      .int()
      .positive()
      .max(financeAutoEntryMaxAmountCents),
    type: z.literal("consortium"),
  }),
]);
