import { and, eq, isNull } from "drizzle-orm";
import type { InferInsertModel, InferSelectModel } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { vehicleSuppliers, vehicleUnitAcquisitions } from "@lojaveiculosv2/db";
import type * as schema from "@lojaveiculosv2/db";
import type {
  CreateVehicleSupplierRecord,
  UpdateVehicleSupplierRecord,
  UpsertVehicleUnitAcquisitionRecord,
  VehicleAcquisitionRepository,
  VehicleAcquisitionScope,
  VehicleSupplier,
  VehicleUnitAcquisition,
} from "../../../domains/vehicle/ports/vehicleAcquisitionRepository.js";
import { isVehicleInventoryUuid } from "./drizzleVehicleInventoryScope.js";

type SupplierRow = InferSelectModel<typeof vehicleSuppliers>;
type InsertSupplierRow = InferInsertModel<typeof vehicleSuppliers>;
type AcquisitionRow = InferSelectModel<typeof vehicleUnitAcquisitions>;
type InsertAcquisitionRow = InferInsertModel<typeof vehicleUnitAcquisitions>;

export type DrizzleVehicleAcquisitionClient = PostgresJsDatabase<typeof schema>;

export function createDrizzleVehicleAcquisitionRepository(
  db: DrizzleVehicleAcquisitionClient,
): VehicleAcquisitionRepository {
  return {
    async archiveSupplier(input) {
      const scope = requireScope(input);
      if (!isVehicleInventoryUuid(input.supplierId)) return null;
      const [row] = await db
        .update(vehicleSuppliers)
        .set({ deletedAt: new Date(), isDeleted: true })
        .where(supplierWhere(scope, input.supplierId))
        .returning();
      return row ? toSupplier(row) : null;
    },
    async createSupplier(record) {
      const [row] = await db
        .insert(vehicleSuppliers)
        .values(toInsertSupplier(record))
        .returning();
      if (!row) throw new Error("Drizzle adapter did not return supplier.");
      return toSupplier(row);
    },
    async findSupplierById(input) {
      const scope = requireScope(input);
      if (!isVehicleInventoryUuid(input.supplierId)) return null;
      const [row] = await db
        .select()
        .from(vehicleSuppliers)
        .where(supplierWhere(scope, input.supplierId));
      return row ? toSupplier(row) : null;
    },
    async findUnitAcquisition(input) {
      const scope = requireScope(input);
      if (!isVehicleInventoryUuid(input.unitId)) return null;
      const [row] = await db
        .select()
        .from(vehicleUnitAcquisitions)
        .where(acquisitionWhere(scope, input.unitId));
      return row ? toAcquisition(row) : null;
    },
    async listSuppliers(input) {
      const scope = requireScope(input);
      const rows = await db
        .select()
        .from(vehicleSuppliers)
        .where(
          and(
            eq(vehicleSuppliers.storeId, scope.storeId),
            eq(vehicleSuppliers.tenantId, scope.tenantId),
            eq(vehicleSuppliers.isDeleted, false),
            isNull(vehicleSuppliers.deletedAt),
          ),
        );
      return rows
        .map(toSupplier)
        .filter((supplier) => matchesSearch(supplier, input.search ?? null))
        .sort((left, right) =>
          left.displayName.localeCompare(right.displayName),
        )
        .slice(0, input.limit);
    },
    async updateSupplier(input, record) {
      const scope = requireScope(input);
      if (!isVehicleInventoryUuid(input.supplierId)) return null;
      const [row] = await db
        .update(vehicleSuppliers)
        .set(cleanSupplierUpdate(record))
        .where(supplierWhere(scope, input.supplierId))
        .returning();
      return row ? toSupplier(row) : null;
    },
    async upsertUnitAcquisition(scopeInput, record) {
      const scope = requireScope(scopeInput);
      const [existing] = await db
        .select()
        .from(vehicleUnitAcquisitions)
        .where(acquisitionWhere(scope, record.unitId));
      const values = toInsertAcquisition(scope, record);
      const [row] = existing
        ? await db
            .update(vehicleUnitAcquisitions)
            .set(values)
            .where(acquisitionWhere(scope, record.unitId))
            .returning()
        : await db.insert(vehicleUnitAcquisitions).values(values).returning();
      if (!row) throw new Error("Drizzle adapter did not return acquisition.");
      return toAcquisition(row);
    },
  };
}

function supplierWhere(scope: RequiredScope, supplierId: string) {
  return and(
    eq(vehicleSuppliers.id, supplierId),
    eq(vehicleSuppliers.storeId, scope.storeId),
    eq(vehicleSuppliers.tenantId, scope.tenantId),
    eq(vehicleSuppliers.isDeleted, false),
    isNull(vehicleSuppliers.deletedAt),
  );
}

function acquisitionWhere(scope: RequiredScope, unitId: string) {
  return and(
    eq(vehicleUnitAcquisitions.unitId, unitId),
    eq(vehicleUnitAcquisitions.storeId, scope.storeId),
    eq(vehicleUnitAcquisitions.tenantId, scope.tenantId),
    eq(vehicleUnitAcquisitions.isDeleted, false),
    isNull(vehicleUnitAcquisitions.deletedAt),
  );
}

function toInsertSupplier(
  record: CreateVehicleSupplierRecord,
): InsertSupplierRow {
  const scope = requireScope(record);
  return { ...record, storeId: scope.storeId, tenantId: scope.tenantId };
}

function cleanSupplierUpdate(
  record: UpdateVehicleSupplierRecord,
): Partial<InsertSupplierRow> {
  return { ...record, updatedAt: new Date() };
}

function toInsertAcquisition(
  scope: RequiredScope,
  record: UpsertVehicleUnitAcquisitionRecord,
): InsertAcquisitionRow {
  return { ...record, storeId: scope.storeId, tenantId: scope.tenantId };
}

function toSupplier(row: SupplierRow): VehicleSupplier {
  return { ...row, metadata: toJsonRecord(row.metadata) };
}

function toAcquisition(row: AcquisitionRow): VehicleUnitAcquisition {
  return {
    ...row,
    metadata: toJsonRecord(row.metadata),
    sourceSnapshot: toJsonRecord(row.sourceSnapshot),
  };
}

function matchesSearch(
  supplier: VehicleSupplier,
  search: string | null,
): boolean {
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

function toJsonRecord(value: unknown): Record<string, unknown> {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return {};
}

type RequiredScope = { storeId: string; tenantId: string };

function requireScope(input: VehicleAcquisitionScope): RequiredScope {
  if (!input.storeId) throw new Error("Vehicle acquisitions require storeId.");
  if (!input.tenantId)
    throw new Error("Vehicle acquisitions require tenantId.");
  return { storeId: input.storeId, tenantId: input.tenantId };
}
