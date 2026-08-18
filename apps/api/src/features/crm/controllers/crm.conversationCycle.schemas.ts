import { z } from "zod";
import {
  queryBooleanSchema,
  queryUuidListSchema,
} from "./crm.controller.querySchemas.js";

export const crmConversationCycleStateSchema = z.enum([
  "ACTIVE",
  "COMPLETED",
  "EXPIRED",
  "HUMAN_TAKEOVER",
  "MINIBOT_ACTIVE",
]);

export const crmConversationCycleFilterSchema = z.enum([
  "all",
  "fresh",
  "mine",
  "others",
  "unassigned",
]);

export const crmHumanAttendanceStateSchema = z.enum([
  "WAITING_HUMAN",
  "IN_HUMAN_SERVICE",
]);

export const conversationCyclesQuerySchema = z.object({
  assigneeId: z.string().uuid().optional(),
  connectionId: z.string().uuid().optional(),
  filter: crmConversationCycleFilterSchema.default("all"),
  humanAttendanceState: crmHumanAttendanceStateSchema.optional(),
  leadId: z.string().uuid().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(40),
  offset: z.coerce.number().int().min(0).default(0),
  search: z.string().trim().max(120).optional(),
  cycleId: z.string().uuid().optional(),
  status: crmConversationCycleStateSchema.optional(),
  tagIds: queryUuidListSchema,
  unreadOnly: queryBooleanSchema.optional(),
});

export const conversationCycleCountsQuerySchema =
  conversationCyclesQuerySchema.omit({
    assigneeId: true,
    limit: true,
    offset: true,
    cycleId: true,
  });

export const crmMessagesQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(50),
  offset: z.coerce.number().int().min(0).default(0),
});
