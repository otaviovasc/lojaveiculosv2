import { z } from "zod";
import { MAX_CAMPAIGN_MEDIA_BASE64_LENGTH } from "../../../domains/crm/messaging/crmCampaignMediaIngestion.js";

export const crmCampaignStatusSchema = z.enum([
  "cancelled",
  "completed",
  "draft",
  "paused",
  "scheduled",
]);

export const crmCampaignsQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(50),
  status: crmCampaignStatusSchema.optional(),
});

export const crmCampaignParamSchema = z.object({
  campaignId: z.string().uuid(),
});

const campaignRecipientSchema = z.object({
  cycleId: z.string().uuid(),
  variables: z.record(z.string(), z.string()).optional(),
});

export const crmCreateCampaignSchema = z.object({
  content: z.string().trim().min(1).max(4000),
  initialTagId: z.string().uuid().nullable().optional(),
  intervalMinutes: z.number().int().min(1).max(1440).optional(),
  // Allow the base64 expansion of a 10 MiB decoded image plus a small data URI
  // prefix, while the route middleware bounds the complete JSON envelope.
  mediaBase64: z
    .string()
    .trim()
    .min(1)
    .max(MAX_CAMPAIGN_MEDIA_BASE64_LENGTH + 256)
    .nullable()
    .optional(),
  mediaFileName: z.string().trim().max(255).nullable().optional(),
  mediaType: z.string().trim().max(120).nullable().optional(),
  // Campaign media is always uploaded and managed by the server. A public URL
  // supplied by a caller must not be accepted as a campaign asset reference.
  mediaUrl: z.never().optional(),
  name: z.string().trim().min(1).max(191),
  recipients: z.array(campaignRecipientSchema).min(1).max(500),
  replyTagId: z.string().uuid().nullable().optional(),
  scheduledStartAt: z.string().datetime(),
  secondaryContent: z.string().trim().max(4000).nullable().optional(),
  secondaryDelayMinutes: z.number().int().min(1).max(43200).optional(),
});
