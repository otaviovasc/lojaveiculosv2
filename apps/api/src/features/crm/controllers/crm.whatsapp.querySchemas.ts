import { z } from "zod";
import {
  queryBooleanSchema,
  queryUuidListSchema,
} from "./crm.controller.querySchemas.js";

export const whatsappSessionStatusSchema = z.enum([
  "ACTIVE",
  "COMPLETED",
  "EXPIRED",
  "HUMAN_TAKEOVER",
  "MINIBOT_ACTIVE",
]);

export const whatsappSessionFilterSchema = z.enum([
  "all",
  "fresh",
  "mine",
  "others",
  "unassigned",
]);

export const whatsappSessionsQuerySchema = z.object({
  connectionId: z.string().uuid().optional(),
  filter: whatsappSessionFilterSchema.default("all"),
  leadId: z.string().uuid().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(40),
  offset: z.coerce.number().int().min(0).default(0),
  search: z.string().trim().max(120).optional(),
  sessionId: z.string().uuid().optional(),
  status: whatsappSessionStatusSchema.optional(),
  tagIds: queryUuidListSchema,
  unreadOnly: queryBooleanSchema.optional(),
});

export const whatsappSessionCountsQuerySchema =
  whatsappSessionsQuerySchema.omit({
    limit: true,
    offset: true,
    sessionId: true,
  });

export const whatsappMessagesQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(50),
  offset: z.coerce.number().int().min(0).default(0),
});
