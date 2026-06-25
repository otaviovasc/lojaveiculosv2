import { vi } from "vitest";
import type {
  CreateVehicleSupplierRecord,
  UpdateVehicleSupplierRecord,
  UpsertVehicleUnitAcquisitionRecord,
  VehicleAcquisitionRepository,
  VehicleAcquisitionScope,
  VehicleSupplier,
  VehicleUnitAcquisition,
} from "./ports/vehicleAcquisitionRepository.js";
import { testNow } from "./testSupportVehicleServiceFixtures.js";

export type TestVehicleAcquisitionRepository = VehicleAcquisitionRepository & {
  acquisitions: Map<string, VehicleUnitAcquisition>;
  suppliers: Map<string, VehicleSupplier>;
};

type SupplierLookup = VehicleAcquisitionScope & { supplierId: string };
type UnitAcquisitionLookup = VehicleAcquisitionScope & { unitId: string };
type ListSuppliersInput = VehicleAcquisitionScope & {
  limit: number;
  search?: string | null | undefined;
};

export function createTestVehicleAcquisitionRepository(): TestVehicleAcquisitionRepository {
  const acquisitions = new Map<string, VehicleUnitAcquisition>();
  const suppliers = new Map<string, VehicleSupplier>();
  let acquisitionSequence = 1;
  let supplierSequence = 1;

  return {
    acquisitions,
    archiveSupplier: vi.fn(async (input: SupplierLookup) => {
      const supplier = findSupplier(suppliers, input);
      if (!supplier) return null;
      suppliers.delete(supplier.id);
      return { ...supplier, updatedAt: testNow };
    }),
    createSupplier: vi.fn(async (record: CreateVehicleSupplierRecord) => {
      const supplier = createSupplier(record, supplierSequence++);
      suppliers.set(supplier.id, supplier);
      return supplier;
    }),
    findSupplierById: vi.fn(async (input: SupplierLookup) =>
      findSupplier(suppliers, input),
    ),
    findUnitAcquisition: vi.fn(async (input: UnitAcquisitionLookup) => {
      const acquisition = acquisitions.get(input.unitId);
      return acquisition && isScoped(acquisition, input) ? acquisition : null;
    }),
    listSuppliers: vi.fn(async (input: ListSuppliersInput) =>
      [...suppliers.values()]
        .filter((supplier) => isScoped(supplier, input))
        .filter((supplier) => matchesSearch(supplier, input.search ?? null))
        .slice(0, input.limit),
    ),
    suppliers,
    updateSupplier: vi.fn(
      async (input: SupplierLookup, record: UpdateVehicleSupplierRecord) => {
        const supplier = findSupplier(suppliers, input);
        if (!supplier) return null;
        const updated = { ...supplier, ...record, updatedAt: testNow };
        suppliers.set(updated.id, updated);
        return updated;
      },
    ),
    upsertUnitAcquisition: vi.fn(
      async (
        scope: VehicleAcquisitionScope,
        record: UpsertVehicleUnitAcquisitionRecord,
      ) => {
        const existing = acquisitions.get(record.unitId);
        const acquisition = existing
          ? { ...existing, ...record, updatedAt: testNow }
          : createAcquisition(scope, record, acquisitionSequence++);
        acquisitions.set(record.unitId, acquisition);
        return acquisition;
      },
    ),
  };
}

function createSupplier(
  record: CreateVehicleSupplierRecord,
  sequence: number,
): VehicleSupplier {
  return {
    ...record,
    createdAt: testNow,
    id: `supplier_${sequence}`,
    updatedAt: testNow,
  };
}

function createAcquisition(
  scope: VehicleAcquisitionScope,
  record: UpsertVehicleUnitAcquisitionRecord,
  sequence: number,
): VehicleUnitAcquisition {
  return {
    ...record,
    createdAt: testNow,
    id: `acquisition_${sequence}`,
    storeId: scope.storeId,
    tenantId: scope.tenantId,
    updatedAt: testNow,
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
  return [supplier.displayName, supplier.documentNumber, supplier.email]
    .filter(Boolean)
    .some((value) => value?.toLowerCase().includes(normalized));
}
