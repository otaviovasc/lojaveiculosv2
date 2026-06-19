import { and, eq, inArray } from "drizzle-orm";
import {
  vehicleCosts,
  vehiclePriceHistory,
  vehicleStatusHistory,
} from "@lojaveiculosv2/db";
import type * as schema from "@lojaveiculosv2/db";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import type {
  CreateVehicleCostRecord,
  CreateVehiclePriceHistoryRecord,
  CreateVehicleStatusHistoryRecord,
  VehicleCost,
  VehicleOperationsRepository,
  VehiclePriceHistoryEntry,
  VehicleStatusHistoryEntry,
} from "../../../domains/vehicle/ports/vehicleOperationsRepository.js";
import type { FindVehicleListingInput } from "../../../domains/vehicle/ports/vehicleInventoryRepository.js";
import type { ListVehicleCostsInput } from "../../../domains/vehicle/ports/vehicleOperationsRepository.js";

type CostRow = typeof vehicleCosts.$inferSelect;
type PriceRow = typeof vehiclePriceHistory.$inferSelect;
type StatusRow = typeof vehicleStatusHistory.$inferSelect;

export type DrizzleVehicleOperationsClient = PostgresJsDatabase<typeof schema>;

export function createDrizzleVehicleOperationsRepository(
  db: DrizzleVehicleOperationsClient,
): VehicleOperationsRepository {
  return {
    async createCost(record) {
      const scope = requireScope(record);
      const [row] = await db
        .insert(vehicleCosts)
        .values({ ...record, storeId: scope.storeId, tenantId: scope.tenantId })
        .returning();
      return toCost(requireRow(row));
    },
    async createPriceHistory(record) {
      const scope = requireScope(record);
      const [row] = await db
        .insert(vehiclePriceHistory)
        .values({ ...record, storeId: scope.storeId, tenantId: scope.tenantId })
        .returning();
      return toPriceHistory(requireRow(row));
    },
    async createStatusHistory(record) {
      const scope = requireScope(record);
      const [row] = await db
        .insert(vehicleStatusHistory)
        .values({ ...record, storeId: scope.storeId, tenantId: scope.tenantId })
        .returning();
      return toStatusHistory(requireRow(row));
    },
    async listCostsByUnitIds(input: ListVehicleCostsInput) {
      const scope = requireScope(input);
      if (input.unitIds.length === 0) return [];
      const rows = await db
        .select()
        .from(vehicleCosts)
        .where(
          and(
            eq(vehicleCosts.storeId, scope.storeId),
            eq(vehicleCosts.tenantId, scope.tenantId),
            inArray(vehicleCosts.unitId, [...input.unitIds]),
          ),
        );
      return rows.map(toCost);
    },
    async listPriceHistoryByListing(input) {
      const scope = requireScope(input);
      const rows = await db
        .select()
        .from(vehiclePriceHistory)
        .where(
          and(
            eq(vehiclePriceHistory.listingId, input.listingId),
            eq(vehiclePriceHistory.storeId, scope.storeId),
            eq(vehiclePriceHistory.tenantId, scope.tenantId),
          ),
        );
      return rows.map(toPriceHistory);
    },
    async listStatusHistoryByListing(input) {
      const scope = requireScope(input);
      const rows = await db
        .select()
        .from(vehicleStatusHistory)
        .where(
          and(
            eq(vehicleStatusHistory.listingId, input.listingId),
            eq(vehicleStatusHistory.storeId, scope.storeId),
            eq(vehicleStatusHistory.tenantId, scope.tenantId),
          ),
        );
      return rows.map(toStatusHistory);
    },
  };
}

function toCost(row: CostRow): VehicleCost {
  return {
    amountCents: row.amountCents,
    costDate: row.costDate,
    createdAt: row.createdAt,
    description: row.description,
    id: row.id,
    kind: row.kind,
    storeId: row.storeId,
    tenantId: row.tenantId,
    unitId: row.unitId,
    updatedAt: row.updatedAt,
  };
}

function toPriceHistory(row: PriceRow): VehiclePriceHistoryEntry {
  return { ...row };
}

function toStatusHistory(row: StatusRow): VehicleStatusHistoryEntry {
  return { ...row, target: row.target };
}

function requireScope(input: {
  storeId: string | null;
  tenantId: string | null;
}): { storeId: string; tenantId: string } {
  if (!input.storeId) throw new Error("Vehicle operations require storeId.");
  if (!input.tenantId) throw new Error("Vehicle operations require tenantId.");
  return { storeId: input.storeId, tenantId: input.tenantId };
}

function requireRow<T>(row: T | undefined): T {
  if (!row) throw new Error("Vehicle operations write returned no row.");
  return row;
}
