import type { CrmServicePorts } from "../../../domains/crm/services/CrmService/serviceSupport.js";
import {
  createDrizzleVehicleInventoryRepositories,
  type DrizzleVehicleInventoryClient,
} from "../../../infrastructure/db/vehicleInventory/drizzleVehicleInventoryRepository.js";
import type { DrizzleCrmClient } from "../../../infrastructure/db/crm/drizzleCrmRepository.js";

export function createCrmVehicleInventoryPorts(
  client: DrizzleCrmClient,
): NonNullable<CrmServicePorts["vehicleInventory"]> {
  const repositories = createDrizzleVehicleInventoryRepositories(
    client as unknown as DrizzleVehicleInventoryClient,
  );
  return {
    listingRepository: repositories.listingRepository,
    mediaRepository: repositories.mediaRepository,
    unitRepository: repositories.unitRepository,
  };
}
