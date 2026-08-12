import type { Context } from "hono";
import type { z } from "zod";
import { CrmRequestValidationError } from "./crm.controller.errors.js";
import { coreListQuerySchema } from "./crm.core.schemas.js";

export async function parseCoreJson<Schema extends z.ZodType>(
  context: Context,
  schema: Schema,
): Promise<z.infer<Schema>> {
  let body: unknown;
  try {
    body = await context.req.json();
  } catch {
    throw new CrmRequestValidationError("Request body must be valid JSON.");
  }
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    throw new CrmRequestValidationError("CRM core request body is invalid.");
  }
  return parsed.data;
}

export function parseCorePagination(context: Context): {
  cursor?: string;
  limit: number;
} {
  const parsed = coreListQuerySchema.safeParse(context.req.query());
  if (!parsed.success)
    throw new CrmRequestValidationError("CRM core pagination is invalid.");
  return {
    ...(parsed.data.cursor ? { cursor: parsed.data.cursor } : {}),
    limit: parsed.data.limit,
  };
}
