import { assertPermission } from "../../../../shared/authorization.js";
import {
  createServiceLogMetadata,
  type ServiceContext,
} from "../../../../shared/serviceContext.js";
import type {
  VehicleCatalogType,
  VehicleCatalogYearOption,
} from "../../ports/vehicleCatalogProvider.js";
import {
  getCatalogRepository,
  normalizeVehicleType,
  type VehicleCatalogServicePorts,
  vehicleCatalogPermission,
} from "./serviceSupport.js";

export type ListVehicleCatalogYearsInput = {
  brandCode: string;
  vehicleType?: VehicleCatalogType;
  versionCode: string;
};

export async function listVehicleCatalogYears(
  context: ServiceContext,
  input: ListVehicleCatalogYearsInput,
  ports?: VehicleCatalogServicePorts,
): Promise<readonly VehicleCatalogYearOption[]> {
  assertPermission(context, vehicleCatalogPermission);
  const vehicleType = normalizeVehicleType(input.vehicleType);
  context.logger.info(
    "vehicle_catalog.years.list",
    createServiceLogMetadata(context, {
      brandCode: input.brandCode,
      versionCode: input.versionCode,
      vehicleType,
    }),
  );
  const years = await getCatalogRepository(ports).listYears({
    brandCode: input.brandCode,
    vehicleType,
    versionCode: input.versionCode,
  });
  await context.audit.record({
    action: "vehicle_catalog.years.list",
    actor: context.actor,
    category: "data_access",
    entityId: `fipe:${vehicleType}:version:${input.versionCode}:years`,
    entityType: "vehicle_catalog",
    metadata: { count: years.length, permission: vehicleCatalogPermission },
    outcome: "succeeded",
    requestId: context.requestId,
    storeId: context.storeId,
    summary: "Listed vehicle catalog years",
    tenantId: context.tenantId,
  });
  return years;
}
