import { assertPermission } from "../../../../shared/authorization.js";
import {
  createServiceLogMetadata,
  type ServiceContext,
} from "../../../../shared/serviceContext.js";
import type { VehicleCatalogType } from "../../ports/vehicleCatalogProvider.js";
import type { VehicleCatalogVersionOption } from "../../ports/vehicleCatalogRepository.js";
import {
  getCatalogRepository,
  normalizeVehicleType,
  type VehicleCatalogServicePorts,
  vehicleCatalogPermission,
} from "./serviceSupport.js";

export type ListVehicleCatalogVersionsInput = {
  brandCode: string;
  modelFamilyCode: string;
  vehicleType?: VehicleCatalogType;
};

export async function listVehicleCatalogVersions(
  context: ServiceContext,
  input: ListVehicleCatalogVersionsInput,
  ports?: VehicleCatalogServicePorts,
): Promise<readonly VehicleCatalogVersionOption[]> {
  assertPermission(context, vehicleCatalogPermission);
  const vehicleType = normalizeVehicleType(input.vehicleType);
  context.logger.info(
    "vehicle_catalog.versions.list",
    createServiceLogMetadata(context, {
      brandCode: input.brandCode,
      modelFamilyCode: input.modelFamilyCode,
      vehicleType,
    }),
  );
  const versions = await getCatalogRepository(ports).listVersions({
    brandCode: input.brandCode,
    modelFamilyCode: input.modelFamilyCode,
    vehicleType,
  });
  await context.audit.record({
    action: "vehicle_catalog.versions.list",
    actor: context.actor,
    category: "data_access",
    entityId: `fipe:${vehicleType}:family:${input.modelFamilyCode}:versions`,
    entityType: "vehicle_catalog",
    metadata: { count: versions.length, permission: vehicleCatalogPermission },
    outcome: "succeeded",
    requestId: context.requestId,
    storeId: context.storeId,
    summary: "Listed vehicle catalog versions",
    tenantId: context.tenantId,
  });
  return versions;
}
