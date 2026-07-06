import { z } from "zod";

export const leadVisitStatusSchema = z.enum([
  "scheduled",
  "confirmed",
  "completed",
  "no_show",
  "cancelled",
]);

export const listVisitsQuerySchema = z.object({
  from: z.string().datetime().optional(),
  leadId: z.string().uuid().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  offset: z.coerce.number().int().min(0).default(0),
  sessionId: z.string().uuid().optional(),
  status: leadVisitStatusSchema.optional(),
  to: z.string().datetime().optional(),
});

export const createVisitSchema = z.object({
  assignedUserId: z.string().uuid().nullable().optional(),
  leadId: z.string().uuid(),
  notes: z.string().trim().max(2000).nullable().optional(),
  scheduledAt: z.string().datetime(),
  sessionId: z.string().uuid().optional(),
});

export const updateVisitSchema = z.object({
  assignedUserId: z.string().uuid().nullable().optional(),
  notes: z.string().trim().max(2000).nullable().optional(),
  scheduledAt: z.string().datetime().optional(),
  status: z.enum(["scheduled", "confirmed", "no_show"]).optional(),
});
