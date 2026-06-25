import { assertPermission } from "../../../../shared/authorization.js";
import type { ServiceContext } from "../../../../shared/serviceContext.js";
import type {
  CreateVehicleSupplierRecord,
  UpdateVehicleSupplierRecord,
  VehicleSupplier,
  VehicleSupplierKind,
} from "../../ports/vehicleAcquisitionRepository.js";
import {
  auditVehicleServiceEvent,
  getAcquisitionRepository,
  logVehicleServiceEvent,
  VehicleSupplierNotFoundError,
  type VehicleInventoryServicePorts,
} from "./serviceSupport.js";

const readPermission = "inventory.read";
const writePermission = "inventory.update_unit";

export type ListVehicleSuppliersInput = {
  limit?: number | undefined;
  search?: string | null | undefined;
};

export type CreateVehicleSupplierInput = {
  displayName: string;
  documentNumber?: string | null | undefined;
  email?: string | null | undefined;
  externalProviderId?: string | null | undefined;
  kind: VehicleSupplierKind;
  phone?: string | null | undefined;
  provider?: string | null | undefined;
};

export type UpdateVehicleSupplierInput = Partial<CreateVehicleSupplierInput> & {
  supplierId: string;
};

export async function listVehicleSuppliers(
  context: ServiceContext,
  input: ListVehicleSuppliersInput = {},
  ports?: VehicleInventoryServicePorts,
): Promise<readonly VehicleSupplier[]> {
  assertPermission(context, readPermission);
  logVehicleServiceEvent(context, "vehicle_supplier.list.started", {
    search: input.search ?? null,
  });
  const suppliers = await getAcquisitionRepository(ports).listSuppliers({
    limit: input.limit ?? 50,
    search: input.search ?? null,
    storeId: context.storeId,
    tenantId: context.tenantId,
  });
  await auditVehicleServiceEvent(context, {
    action: "vehicle_supplier.list",
    category: "data_access",
    entityId: context.storeId ?? context.tenantId ?? "inventory",
    entityType: "vehicle_supplier",
    metadata: { count: suppliers.length, search: input.search ?? null },
    permission: readPermission,
    summary: "Listed vehicle suppliers",
  });
  return suppliers;
}

export async function createVehicleSupplier(
  context: ServiceContext,
  input: CreateVehicleSupplierInput,
  ports?: VehicleInventoryServicePorts,
): Promise<VehicleSupplier> {
  assertPermission(context, writePermission);
  logVehicleServiceEvent(context, "vehicle_supplier.create.started", {
    kind: input.kind,
  });
  const supplier = await getAcquisitionRepository(ports).createSupplier(
    supplierRecord(context, input),
  );
  await auditVehicleServiceEvent(context, {
    action: "vehicle_supplier.create",
    category: "data_change",
    entityId: supplier.id,
    entityType: "vehicle_supplier",
    metadata: { displayName: supplier.displayName, kind: supplier.kind },
    permission: writePermission,
    summary: "Created vehicle supplier",
  });
  return supplier;
}

export async function updateVehicleSupplier(
  context: ServiceContext,
  input: UpdateVehicleSupplierInput,
  ports?: VehicleInventoryServicePorts,
): Promise<VehicleSupplier> {
  assertPermission(context, writePermission);
  logVehicleServiceEvent(context, "vehicle_supplier.update.started", {
    supplierId: input.supplierId,
  });
  const supplier = await getAcquisitionRepository(ports).updateSupplier(
    supplierLookup(context, input.supplierId),
    cleanSupplierUpdate(input),
  );
  if (!supplier) throw new VehicleSupplierNotFoundError(input.supplierId);
  await auditVehicleServiceEvent(context, {
    action: "vehicle_supplier.update",
    category: "data_change",
    entityId: supplier.id,
    entityType: "vehicle_supplier",
    metadata: { displayName: supplier.displayName, kind: supplier.kind },
    permission: writePermission,
    summary: "Updated vehicle supplier",
  });
  return supplier;
}

export async function archiveVehicleSupplier(
  context: ServiceContext,
  input: { supplierId: string },
  ports?: VehicleInventoryServicePorts,
): Promise<VehicleSupplier> {
  assertPermission(context, writePermission);
  logVehicleServiceEvent(context, "vehicle_supplier.archive.started", input);
  const supplier = await getAcquisitionRepository(ports).archiveSupplier(
    supplierLookup(context, input.supplierId),
  );
  if (!supplier) throw new VehicleSupplierNotFoundError(input.supplierId);
  await auditVehicleServiceEvent(context, {
    action: "vehicle_supplier.archive",
    category: "data_change",
    entityId: supplier.id,
    entityType: "vehicle_supplier",
    metadata: { displayName: supplier.displayName, kind: supplier.kind },
    permission: writePermission,
    summary: "Archived vehicle supplier",
  });
  return supplier;
}

function supplierLookup(context: ServiceContext, supplierId: string) {
  return { storeId: context.storeId, supplierId, tenantId: context.tenantId };
}

function supplierRecord(
  context: ServiceContext,
  input: CreateVehicleSupplierInput,
): CreateVehicleSupplierRecord {
  return {
    displayName: input.displayName,
    documentNumber: input.documentNumber ?? null,
    email: input.email ?? null,
    externalProviderId: input.externalProviderId ?? null,
    kind: input.kind,
    metadata: {},
    phone: input.phone ?? null,
    provider: input.provider ?? null,
    storeId: context.storeId,
    tenantId: context.tenantId,
  };
}

function cleanSupplierUpdate(
  input: UpdateVehicleSupplierInput,
): UpdateVehicleSupplierRecord {
  return {
    ...(input.displayName !== undefined
      ? { displayName: input.displayName }
      : {}),
    ...(input.documentNumber !== undefined
      ? { documentNumber: input.documentNumber ?? null }
      : {}),
    ...(input.email !== undefined ? { email: input.email ?? null } : {}),
    ...(input.externalProviderId !== undefined
      ? { externalProviderId: input.externalProviderId ?? null }
      : {}),
    ...(input.kind !== undefined ? { kind: input.kind } : {}),
    ...(input.phone !== undefined ? { phone: input.phone ?? null } : {}),
    ...(input.provider !== undefined
      ? { provider: input.provider ?? null }
      : {}),
  };
}
