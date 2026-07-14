import type { PermissionKey, RoleKey } from "@lojaveiculosv2/shared";
import { assertAnyPermission } from "../../../../shared/authorization.js";
import { createServiceLogMetadata } from "../../../../shared/serviceContext.js";
import type { ServiceContext } from "../../../../shared/serviceContext.js";
import {
  requireRoleManagementScope,
  type RoleServicePorts,
} from "./serviceSupport.js";

const permissions = [
  "finance.auto_entries.manage",
  "finance.create",
  "finance.read",
  "finance.update",
  "lead.read",
  "lead.update",
  "sale.draft",
  "sale.read",
] satisfies PermissionKey[];

export type StoreMemberOptionView = {
  email: string;
  name: string | null;
  role: RoleKey;
  userId: string;
};

export type StoreMemberOptionsView = {
  members: readonly StoreMemberOptionView[];
};

export async function listStoreMemberOptions(
  context: ServiceContext,
  ports: RoleServicePorts,
): Promise<StoreMemberOptionsView> {
  const permission = assertAnyPermission(context, permissions);
  const scope = requireRoleManagementScope(context);

  context.logger.info(
    "identity.store_member_options.list.started",
    createServiceLogMetadata(context),
  );
  const members = await ports.roleManagementRepository.listActiveMembersByStore(
    {
      storeId: scope.storeId as never,
      tenantId: scope.tenantId as never,
    },
  );

  await context.audit.record({
    action: "identity.store_member_options.list",
    actor: context.actor,
    category: "data_access",
    entityId: scope.storeId,
    entityType: "store",
    metadata: { memberCount: members.length, permission },
    outcome: "succeeded",
    requestId: context.requestId,
    storeId: scope.storeId,
    tenantId: scope.tenantId,
    summary: "Listed active store member options",
  });

  return { members };
}
