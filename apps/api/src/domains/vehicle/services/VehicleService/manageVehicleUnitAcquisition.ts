import { assertPermission } from "../../../../shared/authorization.js";
import type { ServiceContext } from "../../../../shared/serviceContext.js";
import type {
  UpsertVehicleUnitAcquisitionRecord,
  VehicleAcquisitionChannel,
  VehicleAcquisitionCommissionTiming,
  VehicleUnitAcquisition,
} from "../../ports/vehicleAcquisitionRepository.js";
import {
  auditVehicleServiceEvent,
  findScopedUnitById,
  getAcquisitionRepository,
  getUnitRepository,
  logVehicleServiceEvent,
  VehicleSupplierNotFoundError,
  type VehicleInventoryServicePorts,
} from "./serviceSupport.js";

const readPermission = "inventory.read";
const writePermission = "inventory.update_unit";

export type VehicleUnitAcquisitionInput = {
  acquisitionDate?: Date | null | undefined;
  acquisitionPriceCents?: number | null | undefined;
  acquisitionUserId?: string | null | undefined;
  channel: VehicleAcquisitionChannel;
  commissionTiming?: VehicleAcquisitionCommissionTiming | undefined;
  customChannelLabel?: string | null | undefined;
  leadId?: string | null | undefined;
  metadata?: Record<string, unknown> | undefined;
  notes?: string | null | undefined;
  sourceSnapshot?: Record<string, unknown> | undefined;
  supplierId?: string | null | undefined;
  unitId: string;
};

export async function getVehicleUnitAcquisition(
  context: ServiceContext,
  input: { unitId: string },
  ports?: VehicleInventoryServicePorts,
): Promise<VehicleUnitAcquisition | null> {
  assertPermission(context, readPermission);
  const unit = await ensureScopedUnit(context, input, ports);
  logVehicleServiceEvent(context, "vehicle_acquisition.get.started", {
    unitId: input.unitId,
  });
  const acquisition = await getAcquisitionRepository(ports).findUnitAcquisition(
    {
      storeId: context.storeId,
      tenantId: context.tenantId,
      unitId: input.unitId,
    },
  );
  await auditVehicleServiceEvent(context, {
    action: "vehicle_acquisition.get",
    category: "data_access",
    entityId: acquisition?.id ?? input.unitId,
    entityType: "vehicle_acquisition",
    metadata: { listingId: unit.listingId, unitId: input.unitId },
    permission: readPermission,
    summary: "Loaded vehicle acquisition source",
  });
  return acquisition;
}

export async function upsertVehicleUnitAcquisition(
  context: ServiceContext,
  input: VehicleUnitAcquisitionInput,
  ports?: VehicleInventoryServicePorts,
): Promise<VehicleUnitAcquisition> {
  assertPermission(context, writePermission);
  const unit = await ensureScopedUnit(context, input, ports);
  const repository = getAcquisitionRepository(ports);
  if (input.supplierId) {
    const supplier = await repository.findSupplierById({
      storeId: context.storeId,
      supplierId: input.supplierId,
      tenantId: context.tenantId,
    });
    if (!supplier) throw new VehicleSupplierNotFoundError(input.supplierId);
  }
  logVehicleServiceEvent(context, "vehicle_acquisition.upsert.started", {
    channel: input.channel,
    listingId: unit.listingId,
    unitId: input.unitId,
  });
  const acquisition = await repository.upsertUnitAcquisition(
    { storeId: context.storeId, tenantId: context.tenantId },
    acquisitionRecord(input),
  );
  await auditVehicleServiceEvent(context, {
    action: "vehicle_acquisition.upsert",
    category: "data_change",
    entityId: acquisition.id,
    entityType: "vehicle_acquisition",
    metadata: {
      channel: acquisition.channel,
      listingId: unit.listingId,
      supplierId: acquisition.supplierId,
      unitId: acquisition.unitId,
    },
    permission: writePermission,
    summary: "Saved vehicle acquisition source",
  });
  return acquisition;
}

async function ensureScopedUnit(
  context: ServiceContext,
  input: { unitId: string },
  ports?: VehicleInventoryServicePorts,
) {
  return findScopedUnitById(context, getUnitRepository(ports), input.unitId);
}

function acquisitionRecord(
  input: VehicleUnitAcquisitionInput,
): UpsertVehicleUnitAcquisitionRecord {
  return {
    acquisitionDate: input.acquisitionDate ?? null,
    acquisitionPriceCents: input.acquisitionPriceCents ?? null,
    acquisitionUserId: input.acquisitionUserId ?? null,
    channel: input.channel,
    commissionTiming: input.commissionTiming ?? "closed",
    customChannelLabel: input.customChannelLabel ?? null,
    leadId: input.leadId ?? null,
    metadata: input.metadata ?? {},
    notes: input.notes ?? null,
    sourceSnapshot: input.sourceSnapshot ?? {},
    supplierId: input.supplierId ?? null,
    unitId: input.unitId,
  };
}
