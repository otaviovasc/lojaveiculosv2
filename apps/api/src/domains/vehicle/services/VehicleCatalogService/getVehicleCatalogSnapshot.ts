import { assertPermission } from "../../../../shared/authorization.js";
import {
  createServiceLogMetadata,
  type ServiceContext,
} from "../../../../shared/serviceContext.js";
import type {
  VehicleCatalogSnapshot,
  VehicleCatalogType,
} from "../../ports/vehicleCatalogProvider.js";
import {
  getCatalogRepository,
  getCatalogProvider,
  normalizeVehicleType,
  type VehicleCatalogServicePorts,
  vehicleCatalogPermission,
} from "./serviceSupport.js";

export type GetVehicleCatalogSnapshotInput = {
  brandCode: string;
  modelCode: string;
  vehicleType?: VehicleCatalogType;
  yearCode: string;
};

export async function getVehicleCatalogSnapshot(
  context: ServiceContext,
  input: GetVehicleCatalogSnapshotInput,
  ports?: VehicleCatalogServicePorts,
): Promise<VehicleCatalogSnapshot> {
  assertPermission(context, vehicleCatalogPermission);
  const vehicleType = normalizeVehicleType(input.vehicleType);
  context.logger.info(
    "vehicle_catalog.snapshot.get",
    createServiceLogMetadata(context, {
      brandCode: input.brandCode,
      modelCode: input.modelCode,
      vehicleType,
      yearCode: input.yearCode,
    }),
  );
  const repository = getCatalogRepository(ports);
  const cachedSnapshot = await repository.getSnapshot({
    brandCode: input.brandCode,
    versionCode: input.modelCode,
    vehicleType,
    yearCode: input.yearCode,
  });
  const snapshot =
    cachedSnapshot ??
    (await getCatalogProvider(ports).getVehicle({
      brandCode: input.brandCode,
      modelCode: input.modelCode,
      vehicleType,
      yearCode: input.yearCode,
    }));
  if (!cachedSnapshot) await repository.upsertSnapshotDetails(snapshot);
  await context.audit.record({
    action: "vehicle_catalog.snapshot.get",
    actor: context.actor,
    category: "data_access",
    entityId: `fipe:${vehicleType}:${input.brandCode}:${input.modelCode}:${input.yearCode}`,
    entityType: "vehicle_catalog",
    metadata: {
      fipeCode: snapshot.fipeCode,
      permission: vehicleCatalogPermission,
    },
    outcome: "succeeded",
    requestId: context.requestId,
    storeId: context.storeId,
    summary: "Read vehicle catalog snapshot",
    tenantId: context.tenantId,
  });
  return snapshot;
}
