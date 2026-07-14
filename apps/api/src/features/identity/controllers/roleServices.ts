import { listRoleManagement } from "../../../domains/identity/services/RoleService/listRoleManagement.js";
import { listStoreMemberOptions } from "../../../domains/identity/services/RoleService/listStoreMemberOptions.js";
import { updateMembershipAccess } from "../../../domains/identity/services/RoleService/updateMembershipAccess.js";
import type { RoleServicePorts } from "../../../domains/identity/services/RoleService/serviceSupport.js";
import { createMemoryRoleManagementRepository } from "../adapters/memory/roleManagementRepository.js";

export type RoleServices = {
  listRoleManagement: typeof listRoleManagement;
  listStoreMemberOptions: typeof listStoreMemberOptions;
  updateMembershipAccess: typeof updateMembershipAccess;
} & RoleServicePorts;

export function createRoleServices(
  repository = createMemoryRoleManagementRepository(),
): RoleServices {
  return {
    listRoleManagement,
    listStoreMemberOptions,
    roleManagementRepository: repository,
    updateMembershipAccess,
  };
}

export const roleServices = createRoleServices();
