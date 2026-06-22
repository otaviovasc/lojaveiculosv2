import type { AuditOutcome, SafeAuditMetadata } from "@lojaveiculosv2/audit";
import type { PermissionKey } from "@lojaveiculosv2/shared";
import type { Context } from "hono";
import type { z } from "zod";
import {
  RepassesCrmAuthError,
  RepassesCrmRequestError,
  RepassesCrmUnavailableError,
} from "../../../domains/crm/acl/repassesCrmClient.js";
import { resolveStoreSlugFromRequest } from "../../../infrastructure/http/storeScope.js";
import {
  AuthorizationError,
  assertPermission,
} from "../../../shared/authorization.js";
import type { ServiceContext } from "../../../shared/serviceContext.js";

export type WhatsappAuditInput = {
  action: string;
  category: "data_access" | "data_change";
  entityId?: number | string;
  entityType?: string;
  metadata?: SafeAuditMetadata;
  permission: PermissionKey;
  summary: string;
};

export async function parseWhatsappJson<Schema extends z.ZodType>(
  context: Context,
  schema: Schema,
): Promise<z.infer<Schema>> {
  let body: unknown;
  try {
    body = await context.req.json();
  } catch {
    throw new CrmWhatsappValidationError("Request body must be valid JSON.");
  }
  const parsed = schema.safeParse(body);
  if (!parsed.success) throw new CrmWhatsappValidationError();
  return parsed.data;
}

export function createRepassesAuth(
  context: Context,
  serviceContext: ServiceContext,
  repassesConnectionId?: number,
) {
  const authorization = context.req.header("authorization");
  const token = authorization?.match(/^Bearer\s+(.+)$/i)?.[1];
  if (!token) {
    throw new RepassesCrmAuthError(
      "CRM WhatsApp requires a Clerk bearer token.",
    );
  }
  const storeSlug =
    context.req.header("x-store-slug") ?? resolveStoreSlugFromRequest(context);
  return {
    clerkSessionToken: token,
    ...(repassesConnectionId ? { repassesConnectionId } : {}),
    ...(serviceContext.storeId ? { storeId: serviceContext.storeId } : {}),
    ...(storeSlug ? { storeSlug } : {}),
    ...(serviceContext.tenantId ? { tenantId: serviceContext.tenantId } : {}),
  };
}

export function readNumericParam(context: Context, name: string): number {
  const value = Number(context.req.param(name));
  if (!Number.isInteger(value) || value <= 0) {
    throw new CrmWhatsappValidationError(`Route param ${name} is invalid.`);
  }
  return value;
}

export function assertWhatsappRead(context: ServiceContext) {
  return assertWhatsappPermission(context, "lead.read");
}

export function assertWhatsappWrite(context: ServiceContext) {
  return assertWhatsappPermission(context, "lead.update");
}

export async function recordWhatsappAudit(
  context: ServiceContext,
  input: WhatsappAuditInput,
  outcome: AuditOutcome = "succeeded",
  metadata: SafeAuditMetadata = {},
) {
  const scope = readWhatsappScope(context);
  await context.audit.record({
    action: input.action,
    actor: context.actor,
    category: input.category,
    entityId: String(input.entityId ?? scope.storeId),
    entityType: input.entityType ?? "store",
    metadata: {
      permission: input.permission,
      ...(input.metadata ?? {}),
      ...metadata,
    },
    outcome,
    requestId: context.requestId,
    storeId: scope.storeId,
    summary: input.summary,
    tenantId: scope.tenantId,
  });
}

export async function recordWhatsappMutation<T>(
  context: ServiceContext,
  input: WhatsappAuditInput,
  action: () => Promise<T>,
): Promise<T> {
  await recordWhatsappAudit(context, input, "attempted");
  try {
    const result = await action();
    await recordWhatsappAudit(context, input, "succeeded");
    return result;
  } catch (error) {
    await recordWhatsappAudit(context, input, "failed", {
      errorName: error instanceof Error ? error.name : "UnknownError",
    });
    throw error;
  }
}

export async function handleWhatsapp(
  context: Context,
  action: () => Promise<Response>,
): Promise<Response> {
  try {
    return await action();
  } catch (error) {
    if (error instanceof CrmWhatsappValidationError) {
      return context.json({ message: error.message }, 400);
    }
    if (error instanceof RepassesCrmAuthError) {
      return context.json({ message: error.message }, 401);
    }
    if (error instanceof AuthorizationError) {
      return context.json({ message: error.message }, 403);
    }
    if (error instanceof RepassesCrmUnavailableError) {
      return context.json({ message: error.message }, 503);
    }
    if (error instanceof RepassesCrmRequestError) {
      return context.json(
        { message: error.message },
        mapUpstreamStatus(error.statusCode),
      );
    }
    context.error = error instanceof Error ? error : new Error(String(error));
    return context.json({ message: "Internal server error." }, 500);
  }
}

function assertWhatsappPermission(
  context: ServiceContext,
  permission: PermissionKey,
) {
  assertPermission(context, permission);
  readWhatsappScope(context);
  return permission;
}

function readWhatsappScope(context: ServiceContext) {
  if (context.storeId && context.tenantId) {
    return { storeId: context.storeId, tenantId: context.tenantId };
  }
  throw new CrmWhatsappValidationError(
    "CRM WhatsApp routes require tenant and store context.",
  );
}

type WhatsappErrorStatus = 400 | 401 | 403 | 404 | 409 | 422 | 429 | 502;

function mapUpstreamStatus(statusCode: number): WhatsappErrorStatus {
  switch (statusCode) {
    case 400:
    case 401:
    case 403:
    case 404:
    case 409:
    case 422:
    case 429:
      return statusCode;
    default:
      return statusCode >= 400 && statusCode < 500 ? 400 : 502;
  }
}

export class CrmWhatsappValidationError extends Error {
  constructor(message = "Request is invalid.") {
    super(message);
    this.name = "CrmWhatsappValidationError";
  }
}
