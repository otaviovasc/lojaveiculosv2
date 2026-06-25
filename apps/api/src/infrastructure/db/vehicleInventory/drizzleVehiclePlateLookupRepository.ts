import { and, desc, eq, gte } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { vehiclePlateLookups } from "@lojaveiculosv2/db";
import type * as schema from "@lojaveiculosv2/db";
import type {
  InventoryPlateLookupResponse,
  InventoryPlateMetadataItem,
} from "../../../domains/vehicle/ports/vehicleEnrichmentTypes.js";
import type {
  VehiclePlateLookupRecord,
  VehiclePlateLookupRepository,
} from "../../../domains/vehicle/ports/vehicleEnrichmentRepository.js";

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
    response: toPlateLookupResponse(row.responsePayload, row.plate),
    storeId: row.storeId,
    tenantId: row.tenantId,
  };
}

function toPlateLookupResponse(
  value: unknown,
  fallbackPlate: string,
): InventoryPlateLookupResponse {
  const record = isRecord(value) ? value : {};
  const vehicle = isRecord(record.vehicle) ? record.vehicle : {};
  return {
    fipe: isRecord(record.fipe)
      ? {
          brandName: readString(record.fipe.brandName),
          code: readString(record.fipe.code),
          fuel: readString(record.fipe.fuel),
          modelName: readString(record.fipe.modelName),
          modelYear: readNumber(record.fipe.modelYear),
          priceCents: readNumber(record.fipe.priceCents),
          priceLabel: readString(record.fipe.priceLabel),
          referenceMonth: readString(record.fipe.referenceMonth),
          score: readNumber(record.fipe.score),
        }
      : null,
    metadata: readMetadata(record.metadata),
    plate: readString(record.plate) ?? fallbackPlate,
    source: "apibrasil",
    vehicle: {
      aspiration: readString(vehicle.aspiration),
      bodyType: readString(vehicle.bodyType),
      brand: readString(vehicle.brand),
      chassis: readString(vehicle.chassis),
      city: readString(vehicle.city),
      color: readString(vehicle.color),
      engine: readString(vehicle.engine),
      fuel: readString(vehicle.fuel),
      manufactureYear: readNumber(vehicle.manufactureYear),
      mileageKm: readNumber(vehicle.mileageKm),
      model: readString(vehicle.model),
      modelYear: readNumber(vehicle.modelYear),
      origin: readString(vehicle.origin),
      power: readString(vehicle.power),
      state: readString(vehicle.state),
      transmission: readString(vehicle.transmission),
      vehicleType: readString(vehicle.vehicleType),
      version: readString(vehicle.version),
    },
  };
}

function readMetadata(value: unknown): InventoryPlateMetadataItem[] {
  return Array.isArray(value)
    ? value.flatMap((item) => {
        const record = isRecord(item) ? item : null;
        const label = readString(record?.label);
        const itemValue = readString(record?.value);
        return label && itemValue ? [{ label, value: itemValue }] : [];
      })
    : [];
}

function readString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function readNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}
