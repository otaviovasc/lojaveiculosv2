import type { Context } from "hono";
import { z } from "zod";
import { StorefrontRequestValidationError } from "./storefrontErrors.js";

const MINIMUM_SUBMISSION_AGE_MS = 1_500;
const phoneWithAtLeastTenDigits = z
  .string()
  .trim()
  .min(1)
  .max(40)
  .refine((value) => value.replace(/\D/g, "").length >= 10);

const strictLeadSchema = z.object({
  buyerEmail: z.string().trim().email(),
  buyerName: z.string().trim().min(1).max(191),
  buyerPhone: phoneWithAtLeastTenDigits,
  formStartedAt: z.number().int().nonnegative(),
  message: z.string().trim().min(1).max(1000),
  website: z.literal(""),
});

const pageLeadSchema = z.object({
  buyerEmail: z.string().trim().email().optional().or(z.literal("")),
  buyerName: z.string().trim().min(1).max(191),
  buyerPhone: z.string().trim().min(3).max(40).optional().or(z.literal("")),
  message: z.string().trim().max(1000).optional().or(z.literal("")),
});

export async function parseStrictPublicLeadRequest(context: Context) {
  const body = await parseJson(context, strictLeadSchema);
  const submissionAge = Date.now() - body.formStartedAt;
  if (submissionAge < MINIMUM_SUBMISSION_AGE_MS) {
    throw new StorefrontRequestValidationError("Request body is invalid.");
  }
  return body;
}

export async function parsePublicPageLeadRequest(context: Context) {
  return parseJson(context, pageLeadSchema);
}

export function normalizeOptionalLeadText(value?: string | null) {
  return value && value.length > 0 ? value : null;
}

async function parseJson<Schema extends z.ZodType>(
  context: Context,
  schema: Schema,
): Promise<z.infer<Schema>> {
  let body: unknown;

  try {
    body = await context.req.json();
  } catch {
    throw new StorefrontRequestValidationError(
      "Request body must be valid JSON.",
    );
  }

  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    throw new StorefrontRequestValidationError("Request body is invalid.");
  }

  return parsed.data;
}
