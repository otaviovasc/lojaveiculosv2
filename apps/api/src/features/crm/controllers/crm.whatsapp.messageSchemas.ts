import { z } from "zod";

export const whatsappSendTextSchema = z.object({
  replyToMessageId: z.string().uuid().optional(),
  sessionId: z.string().uuid(),
  text: z.string().trim().min(1).max(4000),
});

export const whatsappStartConversationSchema = z
  .object({
    buyerName: z.string().trim().min(1).max(191).optional(),
    connectionId: z.string().uuid(),
    leadId: z.string().uuid().optional(),
    phone: z.string().trim().min(8).max(40).optional(),
    text: z.string().trim().min(1).max(4000),
  })
  .superRefine((input, context) => {
    if (!input.leadId && !input.phone) {
      context.addIssue({
        code: "custom",
        message: "phone is required when leadId is not provided",
        path: ["phone"],
      });
    }
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
