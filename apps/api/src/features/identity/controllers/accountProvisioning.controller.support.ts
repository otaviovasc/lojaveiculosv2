import type { Context } from "hono";
import type { z } from "zod";
import {
  AccountProvisioningConflictError,
  type StoreProfileDraft,
} from "../../../domains/identity/ports/accountProvisioningRepository.js";
import {
  AccountProvisioningPolicyError,
  AccountProvisioningProviderError,
  AccountProvisioningScopeError,
} from "../../../domains/identity/services/AccountProvisioningService/serviceSupport.js";
import type { createOwnerStoreSchema } from "./accountProvisioning.controller.schemas.js";
import { AuthorizationError } from "../../../shared/authorization.js";
import {
  HttpContextAuthenticationError,
  HttpContextAuthorizationError,
  HttpContextRequestPolicyError,
} from "../../../infrastructure/http/createHttpServiceContext.js";
import { ensureHttpRequestId } from "../../../infrastructure/http/requestMetadata.js";
import { InvitationSenderUnavailableError } from "./accountProvisioningServices.js";

export async function handleProvisioning(
  context: Context,
  action: () => Promise<Response>,
): Promise<Response> {
  try {
    return await action();
  } catch (error) {
    if (error instanceof ProvisioningRequestValidationError) {
      const requestId = ensureHttpRequestId(context);
      logValidationFailure(context, error, requestId);
      return context.json(
        {
          ...(error.issues.length ? { issues: error.issues } : {}),
          message: error.message,
          requestId,
        },
        400,
      );
    }
    if (error instanceof AccountProvisioningConflictError) {
      return context.json({ message: error.message }, 409);
    }
    if (
      error instanceof AccountProvisioningPolicyError ||
      error instanceof AccountProvisioningScopeError ||
      error instanceof AuthorizationError ||
      error instanceof HttpContextAuthorizationError
    ) {
      return context.json({ message: error.message }, 403);
    }
    if (error instanceof HttpContextAuthenticationError) {
      return context.json({ message: error.message }, 401);
    }
    if (error instanceof HttpContextRequestPolicyError) {
      return context.json({ message: error.message }, error.statusCode);
    }
    if (
      error instanceof InvitationSenderUnavailableError ||
      error instanceof AccountProvisioningProviderError
    ) {
      return context.json({ message: error.message }, 503);
    }
    context.error = error instanceof Error ? error : new Error(String(error));
    return context.json({ message: "Internal server error." }, 500);
  }
}

export async function parseJson<Schema extends z.ZodType>(
  context: Context,
  schema: Schema,
): Promise<z.infer<Schema>> {
  let body: unknown;
  try {
    body = await context.req.json();
  } catch {
    throw new ProvisioningRequestValidationError(
      "Request body must be valid JSON.",
    );
  }
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    throw new ProvisioningRequestValidationError(
      "Request body is invalid.",
      parsed.error.issues.map(toValidationIssue),
    );
  }
  return parsed.data;
}

export function parseParams<Schema extends z.ZodType>(
  context: Context,
  schema: Schema,
): z.infer<Schema> {
  try {
    return schema.parse(context.req.param());
  } catch {
    throw new ProvisioningRequestValidationError(
      "Route parameters are invalid.",
    );
  }
}

export function cleanProfile(
  input: z.infer<typeof createOwnerStoreSchema>["profile"],
): StoreProfileDraft {
  if (!input) return {};
  return {
    ...(input.contactEmail ? { contactEmail: input.contactEmail } : {}),
    ...(input.contactPhone ? { contactPhone: input.contactPhone } : {}),
    ...(input.documentNumber ? { documentNumber: input.documentNumber } : {}),
    ...(input.whatsappPhone ? { whatsappPhone: input.whatsappPhone } : {}),
  };
}

type ProvisioningValidationIssue = {
  code: string;
  message: string;
  path: string;
};

class ProvisioningRequestValidationError extends Error {
  readonly issues: readonly ProvisioningValidationIssue[];

  constructor(
    message: string,
    issues: readonly ProvisioningValidationIssue[] = [],
  ) {
    super(message);
    this.name = "ProvisioningRequestValidationError";
    this.issues = issues;
  }
}

function toValidationIssue(
  issue: z.core.$ZodIssue,
): ProvisioningValidationIssue {
  return {
    code: issue.code,
    message: issue.message,
    path: issue.path.length ? issue.path.join(".") : "body",
  };
}

function logValidationFailure(
  context: Context,
  error: ProvisioningRequestValidationError,
  requestId: string,
): void {
  if (process.env.APP_ENV !== "local") return;

  console.info(
    JSON.stringify({
      component: "http",
      event: "request.validation_failed",
      issues: error.issues,
      method: context.req.method,
      path: context.req.path,
      requestId,
    }),
  );
}
