import type { Context } from "hono";
import type { z } from "zod";
import { CredereFinancingRequestValidationError } from "./credereFinancing.errors.js";

export async function parseJson<Schema extends z.ZodType>(
  context: Context,
  schema: Schema,
): Promise<z.infer<Schema>> {
  let payload: unknown;
  try {
    payload = await context.req.json();
  } catch {
    throw new CredereFinancingRequestValidationError(
      "Request body must be valid JSON.",
    );
  }

  const result = schema.safeParse(payload);
  if (!result.success) {
    throw new CredereFinancingRequestValidationError(
      "Request body is invalid.",
      {
        issues: result.error.issues.map((issue) => ({
          code: issue.code,
          path: issue.path.join("."),
        })),
      },
    );
  }
  return result.data;
}

export function parseParams<Schema extends z.ZodType>(
  context: Context,
  schema: Schema,
): z.infer<Schema> {
  const result = schema.safeParse(context.req.param());
  if (!result.success) {
    throw new CredereFinancingRequestValidationError(
      "Route parameters are invalid.",
    );
  }
  return result.data;
}

export function parseQuery<Schema extends z.ZodType>(
  context: Context,
  schema: Schema,
): z.infer<Schema> {
  const result = schema.safeParse(context.req.query());
  if (!result.success) {
    throw new CredereFinancingRequestValidationError(
      "Request query is invalid.",
    );
  }
  return result.data;
}

export function readRequiredIdempotencyKey(context: Context) {
  const value = context.req.header("Idempotency-Key")?.trim();
  if (!value) {
    throw new CredereFinancingRequestValidationError(
      "Idempotency-Key header is required.",
      { header: "Idempotency-Key" },
    );
  }
  if (value.length > 191) {
    throw new CredereFinancingRequestValidationError(
      "Idempotency-Key header must not exceed 191 characters.",
      { header: "Idempotency-Key" },
    );
  }
  return value;
}

export function isAsyncSimulationResult(value: unknown) {
  if (!value || typeof value !== "object") return false;
  const status = (value as Record<string, unknown>).status;
  return (
    status === "indeterminate" ||
    status === "pending" ||
    status === "processing" ||
    status === "queued" ||
    status === "requested" ||
    status === "submitted"
  );
}
