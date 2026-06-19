import { listRoleManagement } from "../../../domains/identity/services/RoleService/listRoleManagement.js";
import { updateMembershipAccess } from "../../../domains/identity/services/RoleService/updateMembershipAccess.js";
import type { RoleServicePorts } from "../../../domains/identity/services/RoleService/serviceSupport.js";
import { createMemoryRoleManagementRepository } from "../adapters/memory/roleManagementRepository.js";

export type RoleServices = {
  listRoleManagement: typeof listRoleManagement;
  updateMembershipAccess: typeof updateMembershipAccess;
} & RoleServicePorts;

export function createRoleServices(
  repository = createMemoryRoleManagementRepository(),
): RoleServices {
  return {
    listRoleManagement,
    roleManagementRepository: repository,
    updateMembershipAccess,
  };
}

export const roleServices = createRoleServices();
