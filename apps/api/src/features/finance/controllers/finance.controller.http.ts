import type { Context } from "hono";
import type { z } from "zod";
import { AuthorizationError } from "../../../shared/authorization.js";
import {
  HttpContextAuthenticationError,
  HttpContextAuthorizationError,
  HttpContextRequestPolicyError,
} from "../../../infrastructure/http/createHttpServiceContext.js";
import { jsonApiError } from "../../../infrastructure/http/apiErrorResponse.js";
import { FinanceEntryNotFoundError } from "../../../domains/finance/services/FinanceService/serviceSupport.js";
import { FinanceAutoEntryRuleNotFoundError } from "../../../domains/finance/services/FinanceService/serviceSupport.js";
import { FinanceAutoEntryRuleValidationError } from "../../../domains/finance/services/FinanceService/financeAutoEntryRuleValidation.js";
import { FinanceAutoEntryEvaluationError } from "../../../domains/finance/services/FinanceService/financeAutoEntryEvaluator.js";
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
      return jsonApiError(context, {
        code: "FINANCE_REQUEST_VALIDATION_ERROR",
        error,
        message: error.message,
        status: 400,
      });
    }

    if (
      error instanceof FinanceAutoEntryRuleValidationError ||
      error instanceof FinanceAutoEntryEvaluationError
    ) {
      return jsonApiError(context, {
        code: "FINANCE_AUTO_ENTRY_VALIDATION_ERROR",
        error,
        message: error.message,
        status: 400,
      });
    }

    if (error instanceof AuthorizationError) {
      return jsonApiError(context, {
        code: "AUTHORIZATION_DENIED",
        error,
        message: error.message,
        status: 403,
      });
    }

    if (error instanceof FinanceDocumentStorageScopeError) {
      return jsonApiError(context, {
        code: "FINANCE_STORAGE_SCOPE_ERROR",
        error,
        message: error.message,
        status: 400,
      });
    }

    if (error instanceof FinanceLinkTargetNotFoundError) {
      return jsonApiError(context, {
        code: "FINANCE_LINK_TARGET_NOT_FOUND",
        error,
        message: error.message,
        status: 400,
      });
    }

    if (error instanceof FinanceEntryNotFoundError) {
      return jsonApiError(context, {
        code: "FINANCE_ENTRY_NOT_FOUND",
        error,
        message: error.message,
        status: 404,
      });
    }

    if (error instanceof FinanceAutoEntryRuleNotFoundError) {
      return jsonApiError(context, {
        code: "FINANCE_AUTO_ENTRY_RULE_NOT_FOUND",
        error,
        message: error.message,
        status: 404,
      });
    }

    if (error instanceof HttpContextAuthenticationError) {
      return jsonApiError(context, {
        code: "HTTP_AUTHENTICATION_REQUIRED",
        error,
        message: error.message,
        status: 401,
      });
    }

    if (error instanceof HttpContextAuthorizationError) {
      return jsonApiError(context, {
        code: "HTTP_AUTHORIZATION_DENIED",
        error,
        message: error.message,
        status: 403,
      });
    }

    if (error instanceof HttpContextRequestPolicyError) {
      return jsonApiError(context, {
        code: "HTTP_REQUEST_POLICY_ERROR",
        error,
        message: error.message,
        status: error.statusCode,
      });
    }

    return jsonApiError(context, {
      code: "INTERNAL_SERVER_ERROR",
      error,
      message: "Internal server error.",
      status: 500,
    });
  }
}

export class FinanceRequestValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "FinanceRequestValidationError";
  }
}
