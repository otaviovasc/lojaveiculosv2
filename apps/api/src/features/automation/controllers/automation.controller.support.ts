import type { Context } from "hono";
import type { z } from "zod";
import type { ServiceContext } from "../../../shared/serviceContext.js";
import { HttpContextAuthenticationError } from "../../../infrastructure/http/createHttpServiceContext.js";
import { AutomationRequestValidationError } from "./automationErrorResponses.js";

export type AutomationContextFactory = (
  context: Context,
) => Promise<ServiceContext>;

export async function createProtectedAutomationContext(
  context: Context,
  contextFactory: AutomationContextFactory,
) {
  const serviceContext = await contextFactory(context);
  if (serviceContext.actor.kind !== "user") {
    throw new HttpContextAuthenticationError(
      "Automation requires authenticated user context.",
    );
  }
  return serviceContext;
}

export async function parseAutomationJson<Schema extends z.ZodType>(
  context: Context,
  schema: Schema,
): Promise<z.infer<Schema>> {
  let payload: unknown;
  try {
    payload = await context.req.json();
  } catch {
    throw new AutomationRequestValidationError("Request body is invalid.");
  }
  return parseAutomationValue(payload, schema);
}

export function parseAutomationValue<Schema extends z.ZodType>(
  value: unknown,
  schema: Schema,
): z.infer<Schema> {
  const result = schema.safeParse(value);
  if (!result.success) {
    throw new AutomationRequestValidationError("Request is invalid.", {
      issues: result.error.issues.map((issue) => ({
        code: issue.code,
        path: issue.path.join("."),
      })),
    });
  }
  return result.data;
}
