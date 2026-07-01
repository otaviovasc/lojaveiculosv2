import type { AuditOutcome, SafeAuditMetadata } from "@lojaveiculosv2/audit";
import type { EntitlementKey, PermissionKey } from "@lojaveiculosv2/shared";
import type { Context } from "hono";
import type { z } from "zod";
import { RepassesCrmAuthError } from "../../../domains/crm/acl/repassesCrmClient.js";
import { resolveStoreSlugFromRequest } from "../../../infrastructure/http/storeScope.js";
import {
  assertEntitlement,
  assertPermission,
} from "../../../shared/authorization.js";
import type { ServiceContext } from "../../../shared/serviceContext.js";
import { CrmWhatsappValidationError } from "./crm.whatsapp.errors.js";

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
  return assertWhatsappPermission(context, "crm.whatsapp.read");
}

export function assertWhatsappList(context: ServiceContext) {
  return assertWhatsappPermission(context, "crm.whatsapp.list");
}

export function assertWhatsappSend(context: ServiceContext) {
  return assertWhatsappPermission(context, "crm.whatsapp.send");
}

export function assertWhatsappAssign(context: ServiceContext) {
  return assertWhatsappPermission(context, "crm.whatsapp.assign");
}

export function canWhatsappAssign(context: ServiceContext) {
  readWhatsappScope(context);
  return context.permissions.includes("crm.whatsapp.assign");
}

export function assertWhatsappClose(context: ServiceContext) {
  return assertWhatsappPermission(context, "crm.whatsapp.close");
}

export function assertWhatsappToggleIntervention(context: ServiceContext) {
  return assertWhatsappPermission(context, "crm.whatsapp.toggle_intervention");
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
    const scope = { storeId: context.storeId, tenantId: context.tenantId };
    assertEntitlement(
      { ...context, ...scope, entitlements: readEntitlements(context) },
      "crm",
    );
    return scope;
  }
  throw new CrmWhatsappValidationError(
    "CRM WhatsApp routes require tenant and store context.",
  );
}

function readEntitlements(context: ServiceContext): readonly EntitlementKey[] {
  if (!("entitlements" in context)) return [];
  const entitlements = context.entitlements;
  return Array.isArray(entitlements) ? (entitlements as EntitlementKey[]) : [];
}
