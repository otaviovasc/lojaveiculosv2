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
import type {
  RoleMembership,
  RolePendingInvitation,
} from "../../ports/roleManagementRepository.js";
import {
  requireRoleManagementScope,
  type RoleServicePorts,
} from "./serviceSupport.js";

const permission = "users.manage";

export type RoleTemplateView = {
  assignable: boolean;
  defaultPermissions: readonly PermissionKey[];
  description: string;
  label: string;
  level: number;
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
  pendingInvitations: readonly RolePendingInvitation[];
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
      toMemberView(member, {
        actorMembershipId: actor?.membershipId ?? null,
        actorRole: actor?.role ?? null,
      }),
    ),
    pendingInvitations: state.pendingInvitations,
    permissionGroups,
    roles: visibleRoleKeys.map((role) => ({
      assignable: canAssignRole(actor?.role, role),
      defaultPermissions: getDefaultPermissions(role),
      description: roleDescription(role),
      label: roleLabel(role),
      level: roleLevel(role),
      role,
    })),
  };
}

function toMemberView(
  member: RoleMembership,
  actor: { actorMembershipId: string | null; actorRole: RoleKey | null },
): RoleMemberView {
  return {
    ...member,
    basePermissions: getDefaultPermissions(member.role),
    effectivePermissions: resolvePermissions({
      overrides: member.overrides,
      role: member.role,
    }),
    manageable:
      member.membershipId !== actor.actorMembershipId &&
      canManageTarget(actor.actorRole, member.role),
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

function canManageTarget(actorRole: RoleKey | null, targetRole: RoleKey) {
  if (actorRole === "agency") {
    return !["admin", "agency"].includes(targetRole);
  }
  if (actorRole === "owner") {
    return ["investor", "salesman", "supervisor"].includes(targetRole);
  }
  return false;
}

function canAssignRole(actorRole: RoleKey | undefined, targetRole: RoleKey) {
  if (actorRole === "agency") {
    return ["investor", "owner", "salesman", "supervisor"].includes(targetRole);
  }
  if (actorRole === "owner") {
    return ["investor", "salesman", "supervisor"].includes(targetRole);
  }
  return false;
}

function roleLabel(role: RoleKey): string {
  return {
    admin: "Administrador da Plataforma",
    agency: "Agência Parceira",
    investor: "Investidor",
    owner: "Proprietário da Loja",
    salesman: "Vendedor",
    supervisor: "Supervisor",
  }[role];
}

function roleDescription(role: RoleKey): string {
  return {
    admin:
      "Administrador geral do sistema; não gerenciável nas configurações locais da loja.",
    agency:
      "Operador de nível de agência parceira, com permissão para gerenciar múltiplos proprietários.",
    investor:
      "Acesso de apenas leitura para acompanhamento de resultados financeiros e operacionais.",
    owner:
      "Dono do estabelecimento com controle total sobre as operações, acessos e financeiro da loja.",
    salesman:
      "Usuário focado em atendimento e fluxo de propostas, com acesso limitado a estoque e contatos.",
    supervisor:
      "Gerente operacional com acesso amplo ao controle de estoque e lançamentos financeiros.",
  }[role];
}

function roleLevel(role: RoleKey): number {
  return {
    admin: 100,
    agency: 90,
    owner: 80,
    supervisor: 60,
    salesman: 40,
    investor: 20,
  }[role];
}
