import { assertPermission } from "../../../../shared/authorization.js";
import {
  createServiceLogMetadata,
  type ServiceContext,
} from "../../../../shared/serviceContext.js";
import type {
  VehicleCatalogOption,
  VehicleCatalogType,
} from "../../ports/vehicleCatalogProvider.js";
import {
  getCatalogRepository,
  normalizeVehicleType,
  type VehicleCatalogServicePorts,
  vehicleCatalogPermission,
} from "./serviceSupport.js";

export type ListVehicleCatalogModelsInput = {
  brandCode: string;
  vehicleType?: VehicleCatalogType;
};

export async function listVehicleCatalogModels(
  context: ServiceContext,
  input: ListVehicleCatalogModelsInput,
  ports?: VehicleCatalogServicePorts,
): Promise<readonly VehicleCatalogOption[]> {
  assertPermission(context, vehicleCatalogPermission);
  const vehicleType = normalizeVehicleType(input.vehicleType);
  context.logger.info(
    "vehicle_catalog.models.list",
    createServiceLogMetadata(context, {
      brandCode: input.brandCode,
      vehicleType,
    }),
  );
  const models = await getCatalogRepository(ports).listModelFamilies({
    brandCode: input.brandCode,
    vehicleType,
  });
  await context.audit.record({
    action: "vehicle_catalog.models.list",
    actor: context.actor,
    category: "data_access",
    entityId: `fipe:${vehicleType}:brand:${input.brandCode}:models`,
    entityType: "vehicle_catalog",
    metadata: { count: models.length, permission: vehicleCatalogPermission },
    outcome: "succeeded",
    requestId: context.requestId,
    storeId: context.storeId,
    summary: "Listed vehicle catalog models",
    tenantId: context.tenantId,
  });
  return models;
}
