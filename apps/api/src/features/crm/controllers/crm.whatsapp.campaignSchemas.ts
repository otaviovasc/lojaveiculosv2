import { z } from "zod";

export const whatsappCampaignStatusSchema = z.enum([
  "cancelled",
  "completed",
  "draft",
  "paused",
  "scheduled",
]);

export const whatsappCampaignsQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(50),
  status: whatsappCampaignStatusSchema.optional(),
});

export const whatsappCampaignParamSchema = z.object({
  campaignId: z.string().uuid(),
});

const campaignRecipientSchema = z.object({
  sessionId: z.string().uuid(),
  variables: z.record(z.string(), z.string()).optional(),
});

export const whatsappCreateCampaignSchema = z.object({
  content: z.string().trim().min(1).max(4000),
  initialTagId: z.string().uuid().nullable().optional(),
  intervalMinutes: z.number().int().min(1).max(1440).optional(),
  name: z.string().trim().min(1).max(191),
  recipients: z.array(campaignRecipientSchema).min(1).max(500),
  replyTagId: z.string().uuid().nullable().optional(),
  scheduledStartAt: z.string().datetime(),
  secondaryContent: z.string().trim().max(4000).nullable().optional(),
  secondaryDelayMinutes: z.number().int().min(1).max(43200).optional(),
});
