import type {
  PermissionKey,
  RoleKey,
  StoreMembershipId,
} from "@lojaveiculosv2/shared";
import { assertPermission } from "../../../../shared/authorization.js";
import {
  createServiceLogMetadata,
  type ServiceContext,
} from "../../../../shared/serviceContext.js";
import {
  assignableRoleKeys,
  getDefaultPermissions,
  permissionGroups,
} from "../../domain/permissionCatalog.js";
import type { RolePermissionOverride } from "../../ports/roleManagementRepository.js";
import { listRoleManagement } from "./listRoleManagement.js";
import {
  requireRoleManagementScope,
  RoleManagementPolicyError,
  RoleMembershipNotFoundError,
  type RoleServicePorts,
} from "./serviceSupport.js";

const permission = "users.manage";

export type UpdateMembershipAccessServiceInput = {
  membershipId: string;
  overrides: readonly RolePermissionOverride[];
  role: RoleKey;
};

export async function updateMembershipAccess(
  context: ServiceContext,
  input: UpdateMembershipAccessServiceInput,
  ports: RoleServicePorts,
) {
  assertPermission(context, permission);
  const scope = requireRoleManagementScope(context);
  const before = await ports.roleManagementRepository.listByStore({
    storeId: scope.storeId as never,
    tenantId: scope.tenantId as never,
  });
  const actor = before.memberships.find(
    (member) => member.user.id === context.actor.id,
  );
  const target = before.memberships.find(
    (member) => member.membershipId === input.membershipId,
  );

  enforcePolicy({
    input,
    ...(actor?.membershipId ? { actorMembershipId: actor.membershipId } : {}),
    ...(actor?.role ? { actorRole: actor.role } : {}),
    ...(target ? { target } : {}),
  });

  context.logger.info(
    "identity.roles.update.started",
    createServiceLogMetadata(context, {
      membershipId: input.membershipId,
      role: input.role,
    }),
  );

  await ports.roleManagementRepository.updateMembershipAccess({
    membershipId: input.membershipId as StoreMembershipId,
    overrides: normalizeOverrides(input.overrides, input.role),
    role: input.role,
    storeId: scope.storeId as never,
    tenantId: scope.tenantId as never,
  });

  await context.audit.record({
    action: "identity.roles.update",
    actor: context.actor,
    category: "authorization",
    criticality: "high",
    entityId: input.membershipId,
    entityType: "store_membership",
    metadata: {
      overrideCount: input.overrides.length,
      previousRole: target?.role ?? null,
      role: input.role,
    },
    outcome: "succeeded",
    requestId: context.requestId,
    storeId: scope.storeId,
    tenantId: scope.tenantId,
    summary: "Updated store membership role and permission overrides",
  });

  return listRoleManagement(context, ports);
}

function enforcePolicy(input: {
  actorMembershipId?: string;
  actorRole?: RoleKey;
  input: UpdateMembershipAccessServiceInput;
  target?: { membershipId: string; role: RoleKey };
}) {
  if (input.actorRole !== "agency" && input.actorRole !== "owner") {
    throw new RoleManagementPolicyError(
      "Only agency or owner can manage roles.",
    );
  }
  if (!input.target) {
    throw new RoleMembershipNotFoundError(input.input.membershipId as never);
  }
  if (input.target.membershipId === input.actorMembershipId) {
    throw new RoleManagementPolicyError("Users cannot edit their own role.");
  }
  if (input.target.role === "agency" || input.target.role === "admin") {
    throw new RoleManagementPolicyError(
      "Privileged roles cannot be edited here.",
    );
  }
  if (!isAssignableRole(input.input.role)) {
    throw new RoleManagementPolicyError("Role cannot be assigned here.");
  }
}

function isAssignableRole(role: RoleKey): boolean {
  return assignableRoleKeys.includes(
    role as (typeof assignableRoleKeys)[number],
  );
}

function normalizeOverrides(
  overrides: readonly RolePermissionOverride[],
  role: RoleKey,
): RolePermissionOverride[] {
  const allowedKeys = new Set(allCatalogPermissions());
  const defaultPermissions = new Set(getDefaultPermissions(role));
  const seen = new Set<PermissionKey>();

  return overrides
    .filter((override) => allowedKeys.has(override.permission))
    .filter((override) => {
      const changesDefault =
        defaultPermissions.has(override.permission) !== override.allowed;
      if (!changesDefault || seen.has(override.permission)) return false;
      seen.add(override.permission);
      return true;
    })
    .map((override) => ({
      allowed: override.allowed,
      permission: override.permission,
      reason: override.reason ?? "role_management_ui",
    }));
}

function allCatalogPermissions(): PermissionKey[] {
  return permissionGroups.flatMap((group) =>
    group.permissions.map((permission) => permission.key),
  );
}
