import type { PermissionKey, RoleKey } from "@lojaveiculosv2/shared";
import { assertPermission } from "../../../../shared/authorization.js";
import {
  createServiceLogMetadata,
  type ServiceContext,
} from "../../../../shared/serviceContext.js";
import {
  getDefaultPermissions,
  permissionGroups,
  visibleRoleKeys,
} from "../../domain/permissionCatalog.js";
import { resolvePermissions } from "../../domain/accessPolicy.js";
import type { RoleMembership } from "../../ports/roleManagementRepository.js";
import {
  requireRoleManagementScope,
  type RoleServicePorts,
} from "./serviceSupport.js";

const permission = "users.manage";

export type RoleTemplateView = {
  defaultPermissions: readonly PermissionKey[];
  label: string;
  role: RoleKey;
};

export type RoleMemberView = RoleMembership & {
  basePermissions: readonly PermissionKey[];
  effectivePermissions: readonly PermissionKey[];
  manageable: boolean;
};

export type RoleManagementView = {
  actor: {
    canManageRoles: boolean;
    membershipId: string | null;
    role: RoleKey | null;
  };
  memberships: readonly RoleMemberView[];
  permissionGroups: typeof permissionGroups;
  roles: readonly RoleTemplateView[];
};

export async function listRoleManagement(
  context: ServiceContext,
  ports: RoleServicePorts,
): Promise<RoleManagementView> {
  assertPermission(context, permission);
  const scope = requireRoleManagementScope(context);

  context.logger.info(
    "identity.roles.list.started",
    createServiceLogMetadata(context),
  );

  const state = await ports.roleManagementRepository.listByStore({
    storeId: scope.storeId as never,
    tenantId: scope.tenantId as never,
  });
  const actor = findActorMembership(context, state.memberships);

  await context.audit.record({
    action: "identity.roles.list",
    actor: context.actor,
    category: "data_access",
    entityId: scope.storeId,
    entityType: "store",
    metadata: { membershipCount: state.memberships.length, permission },
    outcome: "succeeded",
    requestId: context.requestId,
    storeId: scope.storeId,
    tenantId: scope.tenantId,
    summary: "Listed role management matrix",
  });

  return {
    actor: {
      canManageRoles: canManageAs(actor?.role),
      membershipId: actor?.membershipId ?? null,
      role: actor?.role ?? null,
    },
    memberships: state.memberships.map((member) =>
      toMemberView(member, actor?.membershipId ?? null),
    ),
    permissionGroups,
    roles: visibleRoleKeys.map((role) => ({
      defaultPermissions: getDefaultPermissions(role),
      label: roleLabel(role),
      role,
    })),
  };
}

function toMemberView(
  member: RoleMembership,
  actorMembershipId: string | null,
): RoleMemberView {
  return {
    ...member,
    basePermissions: getDefaultPermissions(member.role),
    effectivePermissions: resolvePermissions({
      overrides: member.overrides,
      role: member.role,
    }),
    manageable:
      member.membershipId !== actorMembershipId &&
      member.role !== "agency" &&
      member.role !== "admin",
  };
}

function findActorMembership(
  context: ServiceContext,
  memberships: readonly RoleMembership[],
) {
  return memberships.find((member) => member.user.id === context.actor.id);
}

function canManageAs(role?: RoleKey): boolean {
  return role === "agency" || role === "owner";
}

function roleLabel(role: RoleKey): string {
  return {
    admin: "Admin",
    agency: "Agency",
    owner: "Owner",
    salesman: "Salesman",
    supervisor: "Supervisor",
  }[role];
}
