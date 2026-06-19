import type { StoreMembershipId } from "@lojaveiculosv2/shared";
import type { RoleManagementRepository } from "../../ports/roleManagementRepository.js";
import type { ServiceContext } from "../../../../shared/serviceContext.js";

export type RoleServicePorts = {
  roleManagementRepository: RoleManagementRepository;
};

export class RoleManagementScopeError extends Error {
  constructor(fieldName: string) {
    super(`Role management service requires ${fieldName}.`);
    this.name = "RoleManagementScopeError";
  }
}

export class RoleMembershipNotFoundError extends Error {
  constructor(membershipId: StoreMembershipId) {
    super(`Role membership not found: ${membershipId}`);
    this.name = "RoleMembershipNotFoundError";
  }
}

export class RoleManagementPolicyError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "RoleManagementPolicyError";
  }
}

export function requireRoleManagementScope(context: ServiceContext): {
  storeId: string;
  tenantId: string;
} {
  if (!context.storeId) throw new RoleManagementScopeError("storeId");
  if (!context.tenantId) throw new RoleManagementScopeError("tenantId");
  return { storeId: context.storeId, tenantId: context.tenantId };
}
