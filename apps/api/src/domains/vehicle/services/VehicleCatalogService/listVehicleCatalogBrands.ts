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

export type ListVehicleCatalogBrandsInput = {
  vehicleType?: VehicleCatalogType;
};

export async function listVehicleCatalogBrands(
  context: ServiceContext,
  input: ListVehicleCatalogBrandsInput,
  ports?: VehicleCatalogServicePorts,
): Promise<readonly VehicleCatalogOption[]> {
  assertPermission(context, vehicleCatalogPermission);
  const vehicleType = normalizeVehicleType(input.vehicleType);
  context.logger.info(
    "vehicle_catalog.brands.list",
    createServiceLogMetadata(context, { vehicleType }),
  );
  const brands = await getCatalogRepository(ports).listBrands({ vehicleType });
  await context.audit.record({
    action: "vehicle_catalog.brands.list",
    actor: context.actor,
    category: "data_access",
    entityId: `fipe:${vehicleType}:brands`,
    entityType: "vehicle_catalog",
    metadata: { count: brands.length, permission: vehicleCatalogPermission },
    outcome: "succeeded",
    requestId: context.requestId,
    storeId: context.storeId,
    summary: "Listed vehicle catalog brands",
    tenantId: context.tenantId,
  });
  return brands;
}
