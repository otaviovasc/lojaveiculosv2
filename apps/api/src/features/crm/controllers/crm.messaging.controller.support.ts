import type { EntitlementKey, PermissionKey } from "@lojaveiculosv2/shared";
import type { Context } from "hono";
import type { z } from "zod";
import {
  assertEntitlement,
  assertPermission,
} from "../../../shared/authorization.js";
import type { ServiceContext } from "../../../shared/serviceContext.js";
import { CrmMessagingValidationError } from "./crm.messaging.errors.js";

export async function parseCrmMessagingJson<Schema extends z.ZodType>(
  context: Context,
  schema: Schema,
): Promise<z.infer<Schema>> {
  let body: unknown;
  try {
    body = await context.req.json();
  } catch {
    throw new CrmMessagingValidationError("Request body must be valid JSON.");
  }
  const parsed = schema.safeParse(body);
  if (!parsed.success) throw new CrmMessagingValidationError();
  return parsed.data;
}

export function readNumericParam(context: Context, name: string): number {
  const value = Number(context.req.param(name));
  if (!Number.isInteger(value) || value <= 0) {
    throw new CrmMessagingValidationError(`Route param ${name} is invalid.`);
  }
  return value;
}

export function assertConversationRead(context: ServiceContext) {
  return assertCrmMessagingPermission(context, "crm.conversations.read");
}

export function assertMessageSend(context: ServiceContext) {
  return assertCrmMessagingPermission(context, "crm.messages.send");
}

export function assertTagAssign(context: ServiceContext) {
  return assertCrmMessagingPermission(context, "crm.tags.assign");
}

export function assertTagManage(context: ServiceContext) {
  return assertCrmMessagingPermission(context, "crm.tags.manage");
}

export function assertConversationAssign(context: ServiceContext) {
  return assertCrmMessagingPermission(context, "crm.conversations.assign");
}

export function canConversationAssign(context: ServiceContext) {
  readCrmMessagingScope(context);
  return context.permissions.includes("crm.conversations.assign");
}

export function assertConversationManage(context: ServiceContext) {
  return assertCrmMessagingPermission(context, "crm.conversations.manage");
}

export function assertExternalBotRead(context: ServiceContext) {
  return assertCrmMessagingPermission(context, "crm.bot.read");
}

export function assertExternalBotManage(context: ServiceContext) {
  return assertCrmMessagingPermission(context, "crm.bot.manage");
}

export function assertExternalBotProposalDecide(context: ServiceContext) {
  return assertCrmMessagingPermission(context, "crm.bot.proposals.decide");
}

function assertCrmMessagingPermission(
  context: ServiceContext,
  permission: PermissionKey,
) {
  assertPermission(context, permission);
  readCrmMessagingScope(context);
  return permission;
}

function readCrmMessagingScope(context: ServiceContext) {
  if (context.storeId && context.tenantId) {
    const scope = { storeId: context.storeId, tenantId: context.tenantId };
    assertEntitlement(
      { ...context, ...scope, entitlements: readEntitlements(context) },
      "crm",
    );
    return scope;
  }
  throw new CrmMessagingValidationError(
    "CRM routes require tenant and store context.",
  );
}

function readEntitlements(context: ServiceContext): readonly EntitlementKey[] {
  if (!("entitlements" in context)) return [];
  const entitlements = context.entitlements;
  return Array.isArray(entitlements) ? (entitlements as EntitlementKey[]) : [];
}
