import type { Context } from "hono";
import type { z } from "zod";
import { AuthorizationError } from "../../../shared/authorization.js";
import {
  HttpContextAuthenticationError,
  HttpContextAuthorizationError,
  HttpContextRequestPolicyError,
} from "../../../infrastructure/http/createHttpServiceContext.js";
import { FinanceEntryNotFoundError } from "../../../domains/finance/services/FinanceService/serviceSupport.js";
import { FinanceDocumentStorageScopeError } from "../../../domains/finance/services/FinanceService/attachFinanceEntryDocument.js";
import { FinanceLinkTargetNotFoundError } from "../../../infrastructure/db/finance/drizzleFinanceLinkTargets.js";

export async function parseJson<Schema extends z.ZodType>(
  context: Context,
  schema: Schema,
): Promise<z.infer<Schema>> {
  let body: unknown;

  try {
    body = await context.req.json();
  } catch {
    throw new FinanceRequestValidationError("Request body must be valid JSON.");
  }

  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    throw new FinanceRequestValidationError("Request body is invalid.");
  }

  return parsed.data;
}

export async function handleFinance(
  context: Context,
  action: () => Promise<Response>,
): Promise<Response> {
  try {
    return await action();
  } catch (error) {
    if (error instanceof FinanceRequestValidationError) {
      return context.json({ message: error.message }, 400);
    }

    if (error instanceof AuthorizationError) {
      return context.json({ message: error.message }, 403);
    }

    if (error instanceof FinanceDocumentStorageScopeError) {
      return context.json({ message: error.message }, 400);
    }

    if (error instanceof FinanceLinkTargetNotFoundError) {
      return context.json({ message: error.message }, 400);
    }

    if (error instanceof FinanceEntryNotFoundError) {
      return context.json({ message: error.message }, 404);
    }

    if (error instanceof HttpContextAuthenticationError) {
      return context.json({ message: error.message }, 401);
    }

    if (error instanceof HttpContextAuthorizationError) {
      return context.json({ message: error.message }, 403);
    }

    if (error instanceof HttpContextRequestPolicyError) {
      return context.json({ message: error.message }, error.statusCode);
    }

    context.error = error instanceof Error ? error : new Error(String(error));
    return context.json({ message: "Internal server error." }, 500);
  }
}

export class FinanceRequestValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "FinanceRequestValidationError";
  }
}
