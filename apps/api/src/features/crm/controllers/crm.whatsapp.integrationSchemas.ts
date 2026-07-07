import { z } from "zod";

export const whatsappBotActionNameSchema = z.enum([
  "add_note",
  "assign_tag",
  "check_connection",
  "close_session",
  "create_tag",
  "get_session",
  "list_tags",
  "remove_tag",
  "remove_visita",
  "schedule_message",
  "send_audio",
  "send_document",
  "send_image",
  "send_text",
  "set_intervention",
  "set_visita",
  "update_session",
]);

export const whatsappBotActionSchema = z
  .object({
    action: whatsappBotActionNameSchema,
    connectionId: z.string().uuid().optional(),
    idempotencyKey: z.string().trim().min(1).max(120).optional(),
    leadId: z.string().uuid().optional(),
    payload: z.record(z.string(), z.unknown()).optional(),
    sessionId: z.string().uuid().optional(),
    tagId: z.string().uuid().optional(),
    visitId: z.string().uuid().optional(),
  })
  .strict();

export const whatsappBotIntegrationUpdateSchema = z.object({
  enabled: z.boolean().optional(),
  webhookSecret: z.string().trim().min(8).max(256).nullable().optional(),
  webhookUrl: z.string().trim().url().max(500).nullable().optional(),
});
