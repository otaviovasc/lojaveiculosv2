import { z } from "zod";

export const whatsappBotIntegrationUpdateSchema = z.object({
  enabled: z.boolean().optional(),
  webhookSecret: z.string().trim().min(8).max(256).nullable().optional(),
  webhookUrl: z.string().trim().url().max(500).nullable().optional(),
});
