import { and, eq, inArray } from "drizzle-orm";
import { vehicleChecklists } from "@lojaveiculosv2/db";
import type * as schema from "@lojaveiculosv2/db";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import type {
  VehicleChecklist,
  VehicleChecklistItem,
  VehicleChecklistItemStatus,
  VehicleChecklistRepository,
} from "../../../domains/vehicle/ports/vehicleChecklistRepository.js";
import { isVehicleInventoryUuid } from "./drizzleVehicleInventoryScope.js";

type ChecklistRow = typeof vehicleChecklists.$inferSelect;
export type DrizzleVehicleChecklistClient = PostgresJsDatabase<typeof schema>;

export function createDrizzleVehicleChecklistRepository(
  db: DrizzleVehicleChecklistClient,
): VehicleChecklistRepository {
  return {
    async create(record) {
      const scope = requireChecklistScope(record);
      const [row] = await db
        .insert(vehicleChecklists)
        .values({ ...record, storeId: scope.storeId, tenantId: scope.tenantId })
        .returning();
      return toChecklist(requireRow(row));
    },
    async findById(input) {
      const scope = requireChecklistScope(input);
      if (!isVehicleInventoryUuid(input.checklistId)) return null;
      if (!isVehicleInventoryUuid(input.unitId)) return null;
      const [row] = await db
        .select()
        .from(vehicleChecklists)
        .where(
          and(
            eq(vehicleChecklists.id, input.checklistId),
            eq(vehicleChecklists.unitId, input.unitId),
            eq(vehicleChecklists.storeId, scope.storeId),
            eq(vehicleChecklists.tenantId, scope.tenantId),
          ),
        );
      return row ? toChecklist(row) : null;
    },
    async listByUnitIds(input) {
      const scope = requireChecklistScope(input);
      const unitIds = input.unitIds.filter(isVehicleInventoryUuid);
      if (unitIds.length === 0) return [];
      const rows = await db
        .select()
        .from(vehicleChecklists)
        .where(
          and(
            inArray(vehicleChecklists.unitId, unitIds),
            eq(vehicleChecklists.storeId, scope.storeId),
            eq(vehicleChecklists.tenantId, scope.tenantId),
          ),
        );
      return rows.map(toChecklist);
    },
    async save(checklist) {
      const scope = requireChecklistScope(checklist);
      const [row] = await db
        .update(vehicleChecklists)
        .set({
          completedAt: checklist.completedAt,
          completedByUserId: checklist.completedByUserId,
          items: [...checklist.items],
          name: checklist.name,
          status: checklist.status,
          updatedAt: checklist.updatedAt,
        })
        .where(
          and(
            eq(vehicleChecklists.id, checklist.id),
            eq(vehicleChecklists.unitId, checklist.unitId),
            eq(vehicleChecklists.storeId, scope.storeId),
            eq(vehicleChecklists.tenantId, scope.tenantId),
          ),
        )
        .returning();
      return toChecklist(requireRow(row));
    },
  };
}

function toChecklist(row: ChecklistRow): VehicleChecklist {
  return {
    completedAt: row.completedAt,
    completedByUserId: row.completedByUserId,
    createdAt: row.createdAt,
    id: row.id,
    items: parseItems(row.items),
    name: row.name,
    status: row.status,
    storeId: row.storeId,
    tenantId: row.tenantId,
    unitId: row.unitId,
    updatedAt: row.updatedAt,
  };
}

function parseItems(value: unknown): readonly VehicleChecklistItem[] {
  if (!Array.isArray(value)) return [];
  return value.filter(isChecklistItem);
}

function isChecklistItem(value: unknown): value is VehicleChecklistItem {
  if (!value || typeof value !== "object") return false;
  const item = value as Record<string, unknown>;
  return (
    typeof item.id === "string" &&
    typeof item.label === "string" &&
    isItemStatus(item.status) &&
    (typeof item.notes === "string" || item.notes === null)
  );
}

function isItemStatus(value: unknown): value is VehicleChecklistItemStatus {
  return ["failed", "passed", "pending", "waived"].includes(String(value));
}

function requireChecklistScope(input: {
  storeId: string | null;
  tenantId: string | null;
}): { storeId: string; tenantId: string } {
  if (!input.storeId) throw new Error("Vehicle checklists require storeId.");
  if (!input.tenantId) throw new Error("Vehicle checklists require tenantId.");
  return { storeId: input.storeId, tenantId: input.tenantId };
}

function requireRow<T>(row: T | undefined): T {
  if (!row) throw new Error("Vehicle checklist write returned no row.");
  return row;
}
