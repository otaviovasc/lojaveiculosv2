import { and, desc, eq, gte } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { vehiclePlateLookups } from "@lojaveiculosv2/db";
import type * as schema from "@lojaveiculosv2/db";
import type {
  VehiclePlateLookupRecord,
  VehiclePlateLookupRepository,
} from "../../../domains/vehicle/ports/vehicleEnrichmentRepository.js";
import { parseVehiclePlateLookupPayload } from "./vehiclePlateLookupPayload.js";

export type DrizzleVehiclePlateLookupClient = PostgresJsDatabase<typeof schema>;

export function createDrizzleVehiclePlateLookupRepository(
  db: DrizzleVehiclePlateLookupClient,
): VehiclePlateLookupRepository {
  return {
    async findLatest(input) {
      if (!input.storeId || !input.tenantId) return null;
      const conditions = [
        eq(vehiclePlateLookups.storeId, input.storeId),
        eq(vehiclePlateLookups.tenantId, input.tenantId),
        eq(vehiclePlateLookups.provider, input.provider),
        eq(vehiclePlateLookups.plate, input.plate),
      ];
      if (input.minFetchedAt) {
        conditions.push(gte(vehiclePlateLookups.fetchedAt, input.minFetchedAt));
      }

      const [row] = await db
        .select()
        .from(vehiclePlateLookups)
        .where(and(...conditions))
        .orderBy(desc(vehiclePlateLookups.fetchedAt))
        .limit(1);

      return row ? toRecord(row) : null;
    },
    async upsert(input) {
      if (!input.storeId || !input.tenantId) {
        throw new Error("Vehicle plate lookup cache requires store scope.");
      }

      const [row] = await db
        .insert(vehiclePlateLookups)
        .values({
          fetchedAt: input.fetchedAt,
          plate: input.plate,
          provider: input.provider,
          responsePayload: input.response,
          storeId: input.storeId,
          tenantId: input.tenantId,
        })
        .onConflictDoUpdate({
          set: {
            fetchedAt: input.fetchedAt,
            responsePayload: input.response,
            updatedAt: new Date(),
          },
          target: [
            vehiclePlateLookups.storeId,
            vehiclePlateLookups.provider,
            vehiclePlateLookups.plate,
          ],
        })
        .returning();

      if (!row) throw new Error("Vehicle plate lookup cache write failed.");
      return toRecord(row);
    },
  };
}

function toRecord(
  row: typeof vehiclePlateLookups.$inferSelect,
): VehiclePlateLookupRecord {
  return {
    fetchedAt: row.fetchedAt,
    id: row.id,
    plate: row.plate,
    provider: row.provider === "apibrasil" ? "apibrasil" : "apibrasil",
    response: parseVehiclePlateLookupPayload(row.responsePayload, row.plate),
    storeId: row.storeId,
    tenantId: row.tenantId,
  };
}
