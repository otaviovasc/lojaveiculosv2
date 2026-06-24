import {
  vehicleCatalogBrands,
  vehicleCatalogModelFamilies,
  vehicleCatalogSyncRuns,
  vehicleCatalogVersions,
  vehicleCatalogYears,
} from "@lojaveiculosv2/db";
import type * as schema from "@lojaveiculosv2/db";
import { and, eq } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import type { VehicleCatalogRepository } from "../../../domains/vehicle/ports/vehicleCatalogRepository.js";
import {
  findBrand,
  findModelFamily,
  findVersion,
  findYear,
  requireRow,
} from "./drizzleVehicleCatalogSupport.js";
import { createDrizzleVehicleCatalogWrites } from "./drizzleVehicleCatalogWrites.js";

export type DrizzleVehicleCatalogClient = PostgresJsDatabase<typeof schema>;

export function createDrizzleVehicleCatalogRepository(
  db: DrizzleVehicleCatalogClient,
): VehicleCatalogRepository {
  return {
    async createSyncRun(input) {
      const [row] = await db
        .insert(vehicleCatalogSyncRuns)
        .values({
          provider: input.provider,
          startedAt: new Date(),
          status: "running",
          vehicleType: input.vehicleType,
        })
        .returning();
      return { id: requireRow(row).id, vehicleType: input.vehicleType };
    },
    async finishSyncRun(input) {
      await db
        .update(vehicleCatalogSyncRuns)
        .set({
          ...input.counts,
          errorMessage: input.errorMessage ?? null,
          finishedAt: new Date(),
          metadata: input.metadata ?? {},
          status: input.status,
        })
        .where(eq(vehicleCatalogSyncRuns.id, input.runId));
    },
    async getSnapshot(input) {
      const version = await findVersion(db, input);
      if (!version) return null;
      const year = await findYear(db, version.id, input.yearCode);
      if (!year) return null;
      const brand = await findBrand(db, input);
      if (!brand) return null;
      return {
        brandCode: input.brandCode,
        brandLogoUrl: brand.logoUrl,
        brandName: brand.name,
        fipeCode: year.fipeCode,
        fuel: year.fuel,
        modelCode: version.fipeCode,
        modelName: version.name,
        modelYear: year.modelYear,
        priceCents: year.priceCents,
        referenceMonth: year.referenceMonth,
        source: "fipe",
        vehicleType: input.vehicleType,
        yearCode: year.fipeYearCode,
        yearName: year.name,
      };
    },
    async listBrands(input) {
      const rows = await db
        .select()
        .from(vehicleCatalogBrands)
        .where(
          and(
            eq(vehicleCatalogBrands.vehicleType, input.vehicleType),
            eq(vehicleCatalogBrands.isActive, true),
          ),
        );
      return rows.map((row) => ({
        code: row.fipeCode,
        imageUrl: row.logoUrl,
        name: row.name,
      }));
    },
    async listModelFamilies(input) {
      const brand = await findBrand(db, input);
      if (!brand) return [];
      const rows = await db
        .select()
        .from(vehicleCatalogModelFamilies)
        .where(
          and(
            eq(vehicleCatalogModelFamilies.brandId, brand.id),
            eq(vehicleCatalogModelFamilies.isActive, true),
          ),
        );
      return rows.map((row) => ({ code: row.slug, name: row.name }));
    },
    async listVersions(input) {
      const family = await findModelFamily(db, input);
      if (!family) return [];
      const rows = await db
        .select()
        .from(vehicleCatalogVersions)
        .where(
          and(
            eq(vehicleCatalogVersions.modelFamilyId, family.id),
            eq(vehicleCatalogVersions.isActive, true),
          ),
        );
      return rows.map((row) => ({
        code: row.fipeCode,
        modelFamilyCode: family.slug,
        modelFamilyName: family.name,
        name: row.name,
      }));
    },
    async listYears(input) {
      const version = await findVersion(db, input);
      if (!version) return [];
      const rows = await db
        .select()
        .from(vehicleCatalogYears)
        .where(
          and(
            eq(vehicleCatalogYears.versionId, version.id),
            eq(vehicleCatalogYears.isActive, true),
          ),
        );
      return rows.map((row) => ({
        code: row.fipeYearCode,
        fuelCode: row.fuelCode,
        modelYear: row.modelYear,
        name: row.name,
      }));
    },
    async getVersionYearSyncState(input) {
      const version = await findVersion(db, input);
      if (!version) return null;
      const rows = await db
        .select({ lastSyncedAt: vehicleCatalogYears.lastSyncedAt })
        .from(vehicleCatalogYears)
        .where(
          and(
            eq(vehicleCatalogYears.versionId, version.id),
            eq(vehicleCatalogYears.isActive, true),
          ),
        );
      const lastSyncedAt = rows.reduce<Date | null>((latest, row) => {
        if (!row.lastSyncedAt) return latest;
        if (!latest || row.lastSyncedAt > latest) return row.lastSyncedAt;
        return latest;
      }, null);
      return { lastSyncedAt, yearCount: rows.length };
    },
    ...createDrizzleVehicleCatalogWrites(db),
  };
}
