import {
  assertEntitlement,
  assertPermission,
} from "../../../../shared/authorization.js";
import type { PermissionKey } from "@lojaveiculosv2/shared";
import type {
  ServiceContext,
  StoreScopedServiceContext,
} from "../../../../shared/serviceContext.js";
import type { CrmCoreScope } from "../models.js";
import { CrmCoreRuleError } from "../errors.js";

export function requireCoreScope(context: ServiceContext): CrmCoreScope {
  if (!context.tenantId || !context.storeId) {
    throw new CrmCoreRuleError(
      "CRM requires tenant and store scope.",
      "CRM_CORE_SCOPE_REQUIRED",
    );
  }
  assertEntitlement(context as StoreScopedServiceContext, "crm");
  return { storeId: context.storeId, tenantId: context.tenantId };
}

export function authorizeCoreRead(context: ServiceContext): CrmCoreScope {
  assertPermission(context, "crm.access");
  return requireCoreScope(context);
}

export function authorizeCoreMutation(context: ServiceContext): CrmCoreScope {
  assertPermission(context, "crm.manage");
  return requireCoreScope(context);
}

export function authorizeCorePermission(
  context: ServiceContext,
  permission: PermissionKey,
): CrmCoreScope {
  assertPermission(context, permission);
  return requireCoreScope(context);
}

export async function auditCoreMutation(
  context: ServiceContext,
  input: {
    action: string;
    entityId: string;
    entityType: string;
    metadata?: Record<string, unknown>;
    permission?: PermissionKey;
  },
): Promise<void> {
  const scope = requireCoreScope(context);
  await context.audit.record({
    action: input.action,
    actor: context.actor,
    category: "data_change",
    entityId: input.entityId,
    entityType: input.entityType,
    metadata: {
      permission: input.permission ?? "crm.manage",
      ...input.metadata,
    },
    outcome: "succeeded",
    requestId: context.requestId,
    storeId: scope.storeId,
    summary: input.action,
    tenantId: scope.tenantId,
  });
}
