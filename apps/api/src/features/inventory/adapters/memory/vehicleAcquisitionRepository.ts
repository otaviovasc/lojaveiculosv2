import type {
  CreateVehicleSupplierRecord,
  UpdateVehicleSupplierRecord,
  UpsertVehicleUnitAcquisitionRecord,
  VehicleAcquisitionRepository,
  VehicleAcquisitionScope,
  VehicleSupplier,
  VehicleUnitAcquisition,
} from "../../../../domains/vehicle/ports/vehicleAcquisitionRepository.js";

export function createMemoryVehicleAcquisitionRepository(): VehicleAcquisitionRepository {
  const acquisitions = new Map<string, VehicleUnitAcquisition>();
  const suppliers = new Map<string, VehicleSupplier>();
  let acquisitionSequence = 1;
  let supplierSequence = 1;

  return {
    archiveSupplier: async (input) => {
      const supplier = findSupplier(suppliers, input);
      if (!supplier) return null;
      suppliers.delete(supplier.id);
      return { ...supplier, updatedAt: new Date() };
    },
    createSupplier: async (record) => {
      const supplier = createSupplier(record, supplierSequence++);
      suppliers.set(supplier.id, supplier);
      return supplier;
    },
    findSupplierById: async (input) => findSupplier(suppliers, input),
    findUnitAcquisition: async (input) => {
      const acquisition = acquisitions.get(input.unitId);
      return acquisition && isScoped(acquisition, input) ? acquisition : null;
    },
    listSuppliers: async (input) =>
      [...suppliers.values()]
        .filter((supplier) => isScoped(supplier, input))
        .filter((supplier) => matchesSearch(supplier, input.search ?? null))
        .sort((left, right) =>
          left.displayName.localeCompare(right.displayName),
        )
        .slice(0, input.limit),
    updateSupplier: async (input, record) => {
      const supplier = findSupplier(suppliers, input);
      if (!supplier) return null;
      const updated = { ...supplier, ...record, updatedAt: new Date() };
      suppliers.set(updated.id, updated);
      return updated;
    },
    upsertUnitAcquisition: async (scope, record) => {
      const existing = acquisitions.get(record.unitId);
      const acquisition = existing
        ? { ...existing, ...record, updatedAt: new Date() }
        : createAcquisition(scope, record, acquisitionSequence++);
      acquisitions.set(record.unitId, acquisition);
      return acquisition;
    },
  };
}

function createSupplier(
  record: CreateVehicleSupplierRecord,
  sequence: number,
): VehicleSupplier {
  const now = new Date();
  return {
    ...record,
    createdAt: now,
    id: `supplier_${sequence}`,
    updatedAt: now,
  };
}

function createAcquisition(
  scope: VehicleAcquisitionScope,
  record: UpsertVehicleUnitAcquisitionRecord,
  sequence: number,
): VehicleUnitAcquisition {
  const now = new Date();
  return {
    ...record,
    createdAt: now,
    id: `acquisition_${sequence}`,
    storeId: scope.storeId,
    tenantId: scope.tenantId,
    updatedAt: now,
  };
}

function findSupplier(
  suppliers: Map<string, VehicleSupplier>,
  input: VehicleAcquisitionScope & { supplierId: string },
) {
  const supplier = suppliers.get(input.supplierId);
  return supplier && isScoped(supplier, input) ? supplier : null;
}

function isScoped(
  item: { storeId: string | null; tenantId: string | null },
  input: VehicleAcquisitionScope,
) {
  return item.storeId === input.storeId && item.tenantId === input.tenantId;
}

function matchesSearch(supplier: VehicleSupplier, search: string | null) {
  if (!search) return true;
  const normalized = search.toLowerCase();
  return [
    supplier.displayName,
    supplier.documentNumber,
    supplier.email,
    supplier.phone,
    supplier.provider,
  ]
    .filter(Boolean)
    .some((value) => value?.toLowerCase().includes(normalized));
}
