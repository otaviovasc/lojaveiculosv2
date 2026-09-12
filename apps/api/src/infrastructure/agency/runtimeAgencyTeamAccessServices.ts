import type { AccountProvisioningServices } from "../../features/identity/controllers/accountProvisioningServices.js";
import type { RoleServices } from "../../features/identity/controllers/roleServices.js";
import { createAgencyTeamAccessServices } from "../../features/agency/controllers/agencyTeamAccessServices.js";
import {
  createDrizzleAgencyTeamAccessStoreDirectory,
  type DrizzleAgencyTeamAccessClient,
} from "./drizzleAgencyTeamAccessRepository.js";

export function createRuntimeAgencyTeamAccessServices(
  db: DrizzleAgencyTeamAccessClient,
  accountServices: AccountProvisioningServices,
  roleServices: RoleServices,
) {
  return createAgencyTeamAccessServices({
    accountServices,
    roleServices,
    storeDirectory: createDrizzleAgencyTeamAccessStoreDirectory(db),
  });
}
