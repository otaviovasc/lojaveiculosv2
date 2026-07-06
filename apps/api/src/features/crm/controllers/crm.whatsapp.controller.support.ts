import type { EntitlementKey, PermissionKey } from "@lojaveiculosv2/shared";
import type { Context } from "hono";
import type { z } from "zod";
import {
  assertEntitlement,
  assertPermission,
} from "../../../shared/authorization.js";
import type { ServiceContext } from "../../../shared/serviceContext.js";
import { CrmWhatsappValidationError } from "./crm.whatsapp.errors.js";

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

export function assertWhatsappTagAssign(context: ServiceContext) {
  return assertWhatsappPermission(context, "crm.whatsapp.tag.assign");
}

export function assertWhatsappTagManage(context: ServiceContext) {
  return assertWhatsappPermission(context, "crm.whatsapp.tag.manage");
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
