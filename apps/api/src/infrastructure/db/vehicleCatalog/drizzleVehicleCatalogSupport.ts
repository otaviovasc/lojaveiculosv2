import {
  vehicleCatalogBrands,
  vehicleCatalogModelFamilies,
  vehicleCatalogVersions,
  vehicleCatalogYears,
} from "@lojaveiculosv2/db";
import { and, eq } from "drizzle-orm";
import type { VehicleCatalogType } from "../../../domains/vehicle/ports/vehicleCatalogProvider.js";
import type { DrizzleVehicleCatalogClient } from "./drizzleVehicleCatalogRepository.js";

export type BrandRow = typeof vehicleCatalogBrands.$inferSelect;
export type FamilyRow = typeof vehicleCatalogModelFamilies.$inferSelect;
export type VersionRow = typeof vehicleCatalogVersions.$inferSelect;
export type YearRow = typeof vehicleCatalogYears.$inferSelect;

export async function findBrand(
  db: DrizzleVehicleCatalogClient,
  input: { brandCode: string; vehicleType: VehicleCatalogType },
): Promise<BrandRow | null> {
  const [row] = await db
    .select()
    .from(vehicleCatalogBrands)
    .where(
      and(
        eq(vehicleCatalogBrands.fipeCode, input.brandCode),
        eq(vehicleCatalogBrands.vehicleType, input.vehicleType),
      ),
    );
  return row ?? null;
}

export async function findModelFamily(
  db: DrizzleVehicleCatalogClient,
  input: {
    brandCode: string;
    modelFamilyCode: string;
    vehicleType: VehicleCatalogType;
  },
): Promise<FamilyRow | null> {
  const brand = await findBrand(db, input);
  if (!brand) return null;
  const [row] = await db
    .select()
    .from(vehicleCatalogModelFamilies)
    .where(
      and(
        eq(vehicleCatalogModelFamilies.brandId, brand.id),
        eq(vehicleCatalogModelFamilies.slug, input.modelFamilyCode),
      ),
    );
  return row ?? null;
}

export async function findVersion(
  db: DrizzleVehicleCatalogClient,
  input: {
    brandCode: string;
    vehicleType: VehicleCatalogType;
    versionCode: string;
  },
): Promise<VersionRow | null> {
  const brand = await findBrand(db, input);
  return brand ? findVersionByBrandId(db, brand.id, input.versionCode) : null;
}

export async function findVersionByBrandId(
  db: DrizzleVehicleCatalogClient,
  brandId: string,
  versionCode: string,
): Promise<VersionRow | null> {
  const [row] = await db
    .select()
    .from(vehicleCatalogVersions)
    .where(
      and(
        eq(vehicleCatalogVersions.brandId, brandId),
        eq(vehicleCatalogVersions.fipeCode, versionCode),
      ),
    );
  return row ?? null;
}

export async function findYear(
  db: DrizzleVehicleCatalogClient,
  versionId: string,
  yearCode: string,
): Promise<YearRow | null> {
  const [row] = await db
    .select()
    .from(vehicleCatalogYears)
    .where(
      and(
        eq(vehicleCatalogYears.versionId, versionId),
        eq(vehicleCatalogYears.fipeYearCode, yearCode),
      ),
    );
  return row ?? null;
}

export function requireRow<T>(row: T | undefined): T {
  if (!row)
    throw new Error("Vehicle catalog repository write returned no row.");
  return row;
}

export function seen<T extends Record<string, unknown>>(
  input: T,
): T & {
  lastSeenAt: Date;
  lastSyncedAt: Date;
} {
  const now = new Date();
  return { ...input, lastSeenAt: now, lastSyncedAt: now };
}

export function slugify(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\+/g, " plus ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}
