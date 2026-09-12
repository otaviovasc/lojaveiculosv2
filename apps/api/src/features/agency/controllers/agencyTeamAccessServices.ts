import type { AccountProvisioningServices } from "../../identity/controllers/accountProvisioningServices.js";
import type { RoleServices } from "../../identity/controllers/roleServices.js";
import { listAgencyTeamAccessStores } from "../../../domains/agency/services/AgencyTeamAccessService/listAgencyTeamAccessStores.js";
import type { AgencyTeamAccessStoreDirectory } from "../../../domains/agency/ports/agencyTeamAccessRepository.js";

export type AgencyTeamAccessServices = {
  accountServices: AccountProvisioningServices;
  listStores: typeof listAgencyTeamAccessStores;
  roleServices: RoleServices;
  storeDirectory: AgencyTeamAccessStoreDirectory;
};

export function createAgencyTeamAccessServices(input: {
  accountServices: AccountProvisioningServices;
  roleServices: RoleServices;
  storeDirectory: AgencyTeamAccessStoreDirectory;
}): AgencyTeamAccessServices {
  return {
    ...input,
    listStores: listAgencyTeamAccessStores,
  };
}
