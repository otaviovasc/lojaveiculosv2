import { z } from "zod";

const templateTextParameterSchema = z
  .object({
    text: z.string().trim().min(1).max(1024),
    type: z.literal("text"),
  })
  .strict();

const templateCurrencyParameterSchema = z
  .object({
    currency: z
      .object({
        amount_1000: z.number().int().safe(),
        code: z.string().regex(/^[A-Z]{3}$/u),
        fallback_value: z.string().trim().min(1).max(64),
      })
      .strict(),
    type: z.literal("currency"),
  })
  .strict();

const templateDateTimeParameterSchema = z
  .object({
    date_time: z
      .object({
        calendar: z.literal("GREGORIAN").optional(),
        day_of_month: z.number().int().min(1).max(31).optional(),
        day_of_week: z.number().int().min(1).max(7).optional(),
        fallback_value: z.string().trim().min(1).max(128),
        hour: z.number().int().min(0).max(23).optional(),
        minute: z.number().int().min(0).max(59).optional(),
        month: z.number().int().min(1).max(12).optional(),
        year: z.number().int().min(1900).max(2200).optional(),
      })
      .strict(),
    type: z.literal("date_time"),
  })
  .strict();

const templateMediaReferenceSchema = z.union([
  z.object({ id: z.string().trim().min(1).max(191) }).strict(),
  z
    .object({
      link: z.string().url().max(2048).startsWith("https://"),
    })
    .strict(),
]);

const templateMediaParameterSchema = z.discriminatedUnion("type", [
  z
    .object({
      document: templateMediaReferenceSchema,
      type: z.literal("document"),
    })
    .strict(),
  z
    .object({
      image: templateMediaReferenceSchema,
      type: z.literal("image"),
    })
    .strict(),
  z
    .object({
      type: z.literal("video"),
      video: templateMediaReferenceSchema,
    })
    .strict(),
]);

const templateBodyParameterSchema = z.union([
  templateTextParameterSchema,
  templateCurrencyParameterSchema,
  templateDateTimeParameterSchema,
]);

const templateComponentSchema = z.discriminatedUnion("type", [
  z
    .object({
      parameters: z.array(templateBodyParameterSchema).max(10),
      type: z.literal("body"),
    })
    .strict(),
  z
    .object({
      parameters: z
        .array(
          z.union([templateTextParameterSchema, templateMediaParameterSchema]),
        )
        .max(1),
      type: z.literal("header"),
    })
    .strict(),
  z
    .object({
      index: z.string().regex(/^\d{1,2}$/u),
      parameters: z
        .array(
          z.union([
            templateTextParameterSchema,
            z
              .object({
                payload: z.string().trim().min(1).max(128),
                type: z.literal("payload"),
              })
              .strict(),
          ]),
        )
        .max(1),
      sub_type: z.enum(["quick_reply", "url"]),
      type: z.literal("button"),
    })
    .strict(),
]);

export const crmSendTextMessageSchema = z.object({
  content: z.string().trim().min(1).max(4000),
  replyToMessageId: z.string().uuid().optional(),
});

export const crmStartConversationSchema = z
  .object({
    customerDisplayName: z.string().trim().min(1).max(191).optional(),
    channel: z.enum(["instagram", "olx_chat", "whatsapp"]),
    leadId: z.string().uuid().optional(),
    recipientAddress: z.string().trim().min(3).max(191).optional(),
    template: z
      .object({
        components: z.array(templateComponentSchema).max(10).optional(),
        languageCode: z.string().trim().min(2).max(35),
        name: z
          .string()
          .trim()
          .regex(/^[a-z0-9_]+$/u)
          .max(512),
      })
      .strict()
      .optional(),
    text: z.string().trim().min(1).max(4000).optional(),
  })
  .superRefine((input, context) => {
    if (!input.leadId && !input.recipientAddress) {
      context.addIssue({
        code: "custom",
        message: "recipientAddress is required when leadId is not provided",
        path: ["recipientAddress"],
      });
    }
    if (Boolean(input.text) === Boolean(input.template)) {
      context.addIssue({
        code: "custom",
        message: "exactly one of text or template is required",
        path: ["text"],
      });
    }
  });

export const crmMessageParamSchema = z.object({
  messageId: z.string().uuid(),
});

export const whatsappSendReactionSchema = z.object({
  reaction: z.string().trim().min(1).max(16),
});

export const crmSendMediaSchema = z
  .object({
    base64: z.string().trim().min(1).max(140_000_000),
    caption: z.string().trim().max(1000).optional(),
    fileName: z.string().trim().max(191).optional(),
    mediaType: z.enum(["audio", "document", "image", "video"]),
    mimeType: z.string().trim().max(120).optional(),
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
