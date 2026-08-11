import { z } from "zod";
import { isPublicHttpsWebhookUrl } from "../../../domains/crm/whatsapp/crmBotWebhookDestination.js";

const positiveCents = z.number().int().positive();
const idString = z.string().trim().min(1).max(128);
const bankCode = z
  .string()
  .trim()
  .regex(/^\d{3}$/);
const nonEmptyString = z.string().trim().min(1).max(256);
const brazilianDate = z
  .string()
  .trim()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .refine((value) => {
    const date = new Date(`${value}T00:00:00.000Z`);
    return (
      Number.isFinite(date.getTime()) &&
      date.toISOString().slice(0, 10) === value
    );
  });
const document = z
  .string()
  .trim()
  .refine((value) => [11, 14].includes(value.replace(/\D/g, "").length));
const phone = z
  .string()
  .trim()
  .refine((value) => {
    const length = value.replace(/\D/g, "").length;
    return length >= 10 && length <= 13;
  });

const credereBotPublicSimulationSchema = z
  .object({
    applicant: z
      .object({
        birthDate: brazilianDate.optional(),
        document,
        email: z.string().trim().email().max(320).optional(),
        monthlyIncomeCents: positiveCents.optional(),
        name: nonEmptyString,
        phone,
      })
      .strict(),
    consent: z
      .object({
        creditSimulation: z.literal(true),
        personalData: z.literal(true),
      })
      .strict(),
    leadId: idString.optional(),
    listingId: idString.optional(),
    terms: z
      .object({
        downPaymentCents: positiveCents,
        financedAmountCents: positiveCents.optional(),
        installmentCount: z.number().int().positive().max(120),
        requestedBankCodes: z.array(bankCode).max(20).optional(),
      })
      .strict(),
    unitId: idString.optional(),
    vehicle: z
      .object({
        licensingCity: nonEmptyString,
        licensingUf: z
          .string()
          .trim()
          .regex(/^[A-Z]{2}$/),
        manufactureYear: z.number().int().min(1900).max(2200),
        modelYear: z.number().int().min(1900).max(2200),
        molicarCode: z.string().trim().min(3).max(32),
        priceCents: positiveCents,
        zeroKm: z.boolean().optional(),
      })
      .strict(),
  })
  .strict()
  .superRefine((input, context) => {
    if (input.terms.downPaymentCents >= input.vehicle.priceCents) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Down payment must be lower than the vehicle price.",
        path: ["terms", "downPaymentCents"],
      });
    }
    if (
      input.terms.financedAmountCents !== undefined &&
      input.terms.financedAmountCents !==
        input.vehicle.priceCents - input.terms.downPaymentCents
    ) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Financed amount must equal price minus down payment.",
        path: ["terms", "financedAmountCents"],
      });
    }
  });

const forbiddenBotPayloadKeys = new Set([
  "Store-Id",
  "credereStoreId",
  "credereVehicleModelId",
  "externalStoreId",
  "providerStoreId",
  "sellerCpf",
  "storeId",
  "tenantId",
  "vehicleMolicarCode",
]);

export const whatsappBotActionNameSchema = z.enum([
  "add_note",
  "assign_tag",
  "check_connection",
  "close_session",
  "create_tag",
  "credere_create_simulation",
  "credere_get_simulation",
  "credere_readiness",
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
  .strict()
  .superRefine((input, context) => {
    rejectForbiddenBotPayloadKeys(input.payload ?? {}, context, ["payload"]);

    if (input.action === "set_intervention") {
      const parsed = z
        .object({
          enabled: z.boolean(),
          interventionId: z.string().uuid().optional(),
          reason: z.string().trim().min(1).max(120).optional(),
          source: z.enum(["bot", "auto", "ai_request"]).optional(),
        })
        .strict()
        .safeParse(input.payload);
      if (!parsed.success) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          message:
            "set_intervention payload must include enabled and valid optional interventionId, reason, and source fields.",
          path: ["payload"],
        });
      }
    }

    if (input.action !== "credere_create_simulation") return;
    const simulation = input.payload?.simulation;
    if (!input.idempotencyKey) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "idempotencyKey is required for Credere simulation creation.",
        path: ["idempotencyKey"],
      });
    }
    const parsed = credereBotPublicSimulationSchema.safeParse(simulation);
    if (!parsed.success) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message:
          "Payload field simulation must match the public financing simulation contract.",
        path: ["payload", "simulation"],
      });
    }
  });

export const whatsappBotIntegrationUpdateSchema = z.object({
  enabled: z.boolean().optional(),
  webhookSecret: z.string().trim().min(32).max(256).nullable().optional(),
  webhookUrl: z
    .string()
    .trim()
    .url()
    .max(500)
    .refine(isPublicHttpsWebhookUrl, {
      message:
        "Webhook URL must use public HTTPS without embedded credentials.",
    })
    .nullable()
    .optional(),
});

function rejectForbiddenBotPayloadKeys(
  value: unknown,
  context: z.RefinementCtx,
  path: (number | string)[],
) {
  if (!value || typeof value !== "object") return;
  if (Array.isArray(value)) {
    value.forEach((item, index) =>
      rejectForbiddenBotPayloadKeys(item, context, [...path, index]),
    );
    return;
  }
  for (const [key, nested] of Object.entries(value)) {
    if (forbiddenBotPayloadKeys.has(key)) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Payload field ${key} is not allowed.`,
        path: [...path, key],
      });
    }
    rejectForbiddenBotPayloadKeys(nested, context, [...path, key]);
  }
}
