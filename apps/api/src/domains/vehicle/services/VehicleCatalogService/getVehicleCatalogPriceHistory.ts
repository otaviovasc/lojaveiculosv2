import { assertPermission } from "../../../../shared/authorization.js";
import {
  createServiceLogMetadata,
  type ServiceContext,
} from "../../../../shared/serviceContext.js";
import type {
  VehicleCatalogPriceHistory,
  VehicleCatalogType,
} from "../../ports/vehicleCatalogProvider.js";
import {
  getCatalogProvider,
  getCatalogRepository,
  normalizeVehicleType,
  type VehicleCatalogServicePorts,
  vehicleCatalogPermission,
} from "./serviceSupport.js";

export type GetVehicleCatalogPriceHistoryInput = {
  fipeCode: string;
  referenceCode?: string | undefined;
  vehicleType?: VehicleCatalogType | undefined;
  yearCode: string;
};

export async function getVehicleCatalogPriceHistory(
  context: ServiceContext,
  input: GetVehicleCatalogPriceHistoryInput,
  ports?: VehicleCatalogServicePorts,
): Promise<VehicleCatalogPriceHistory> {
  assertPermission(context, vehicleCatalogPermission);
  const vehicleType = normalizeVehicleType(input.vehicleType);
  context.logger.info(
    "vehicle_catalog.price_history.get",
    createServiceLogMetadata(context, {
      fipeCode: input.fipeCode,
      referenceCode: input.referenceCode ?? null,
      vehicleType,
      yearCode: input.yearCode,
    }),
  );

  const repository = getCatalogRepository(ports);
  const cached = input.referenceCode
    ? []
    : await repository.listPriceHistory({
        fipeCode: input.fipeCode,
        vehicleType,
        yearCode: input.yearCode,
      });
  const history =
    cached.length > 0
      ? createCachedHistory(input, vehicleType, cached)
      : await getCatalogProvider(ports).getVehicleHistory({
          fipeCode: input.fipeCode,
          referenceCode: input.referenceCode,
          vehicleType,
          yearCode: input.yearCode,
        });
  if (cached.length === 0 && history.entries.length > 0) {
    await repository.upsertPriceHistory({
      entries: history.entries,
      fipeCode: history.fipeCode,
      vehicleType,
      yearCode: input.yearCode,
    });
  }
  await context.audit.record({
    action: "vehicle_catalog.price_history.get",
    actor: context.actor,
    category: "data_access",
    entityId: `fipe:${vehicleType}:${input.fipeCode}:${input.yearCode}:history`,
    entityType: "vehicle_catalog",
    metadata: {
      entries: history.entries.length,
      permission: vehicleCatalogPermission,
    },
    outcome: "succeeded",
    requestId: context.requestId,
    storeId: context.storeId,
    summary: "Read vehicle catalog price history",
    tenantId: context.tenantId,
  });
  return history;
}

function createCachedHistory(
  input: GetVehicleCatalogPriceHistoryInput,
  vehicleType: VehicleCatalogType,
  entries: VehicleCatalogPriceHistory["entries"],
): VehicleCatalogPriceHistory {
  return {
    brandName: null,
    entries,
    fipeCode: input.fipeCode,
    fuel: null,
    modelName: null,
    modelYear: null,
    source: "fipe",
    vehicleType,
    yearCode: input.yearCode,
  };
}
