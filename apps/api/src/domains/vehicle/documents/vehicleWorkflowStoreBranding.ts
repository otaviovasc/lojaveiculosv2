import type { ServiceContext } from "../../../shared/serviceContext.js";
import type { VehicleStoreBranding } from "../ports/vehicleStoreBrandingReader.js";
import {
  getStoreBrandingReader,
  type VehicleInventoryServicePorts,
} from "../services/VehicleService/serviceSupport.js";

export async function getVehicleWorkflowStoreBranding(
  context: ServiceContext,
  ports: VehicleInventoryServicePorts | undefined,
): Promise<VehicleStoreBranding | undefined> {
  const reader = getStoreBrandingReader(ports);
  if (!reader || !context.storeId || !context.tenantId) return undefined;
  return (
    (await reader.findByStore({
      storeId: context.storeId,
      tenantId: context.tenantId,
    })) ?? undefined
  );
}
