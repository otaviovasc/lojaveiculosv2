import { createReadStream } from "node:fs";
import { createInterface } from "node:readline";
import * as productSchema from "@lojaveiculosv2/db";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { splitVehicleCatalogName } from "../domains/vehicle/catalog/catalogNameNormalization.js";
import type { VehicleCatalogType } from "../domains/vehicle/ports/vehicleCatalogProvider.js";
import {
  parseFipeModelYear,
  parseFipePriceCents,
} from "../infrastructure/catalog/fipeVehicleCatalogMapping.js";
import { resolveVehicleBrandLogoUrl } from "../infrastructure/catalog/vehicleBrandLogoResolver.js";
import { loadLocalEnv } from "../infrastructure/config/loadLocalEnv.js";
import { createDrizzleVehicleCatalogWrites } from "../infrastructure/db/vehicleCatalog/drizzleVehicleCatalogWrites.js";
import { resolveFipeCsvPath } from "./fipeCsvImportConfig.js";
import { assertFipeCsvHeader, parseFipeCsvRow } from "./fipeCsvImportParser.js";

loadLocalEnv();

const csvPath = resolveFipeCsvPath();

const vehicleTypeByCode: Record<string, VehicleCatalogType> = {
  CAR: "cars",
  MOTO: "motorcycles",
  MOTORCYCLE: "motorcycles",
  TRUCK: "trucks",
};

async function main(): Promise<void> {
  const dbClient = postgres(requireEnv("DATABASE_URL"), { max: 2 });
  const db = drizzle(dbClient, { schema: productSchema });
  const writes = createDrizzleVehicleCatalogWrites(db);

  const counts = {
    brands: new Set<string>(),
    families: new Set<string>(),
    rows: 0,
    skipped: 0,
    versions: new Set<string>(),
    years: new Set<string>(),
  };

  try {
    const lineReader = createInterface({
      crlfDelay: Number.POSITIVE_INFINITY,
      input: createReadStream(csvPath, "utf8"),
    });
    let isHeader = true;
    for await (const line of lineReader) {
      if (isHeader) {
        assertFipeCsvHeader(line);
        isHeader = false;
        continue;
      }
      const row = parseFipeCsvRow(line);
      if (!row) {
        counts.skipped += 1;
        continue;
      }
      const vehicleType = vehicleTypeByCode[row.type];
      if (!vehicleType) {
        counts.skipped += 1;
        continue;
      }

      const brand = await writes.upsertBrand({
        code: row.brandCode,
        imageUrl: resolveVehicleBrandLogoUrl(row.brandValue),
        name: row.brandValue,
        vehicleType,
      });
      counts.brands.add(`${vehicleType}:${brand.id}`);

      const nameParts = splitVehicleCatalogName(row.modelValue);
      const family = await writes.upsertModelFamily({
        brandId: brand.id,
        name: nameParts.modelFamilyName,
        vehicleType,
      });
      counts.families.add(family.id);

      const version = await writes.upsertVersion({
        brandId: brand.id,
        code: row.modelCode,
        modelFamilyId: family.id,
        name: nameParts.versionName,
        providerName: row.modelValue,
        vehicleType,
      });
      counts.versions.add(version.id);

      const modelYear = parseFipeModelYear(row.yearCode);
      await writes.upsertYear({
        code: row.yearCode,
        fuelCode: row.yearCode.includes("-")
          ? (row.yearCode.split("-")[1] ?? null)
          : null,
        modelYear,
        name: row.yearValue,
        versionId: version.id,
      });
      counts.years.add(`${version.id}:${row.yearCode}`);

      await writes.upsertSnapshotDetails({
        brandCode: row.brandCode,
        brandName: row.brandValue,
        fipeCode: row.fipeCode || null,
        fuel: row.fuelType || null,
        modelCode: row.modelCode,
        modelName: row.modelValue,
        modelYear,
        priceCents: parseFipePriceCents(row.price),
        referenceMonth: row.month || null,
        source: "fipe",
        vehicleType,
        yearCode: row.yearCode,
        yearName: row.yearValue,
      });

      counts.rows += 1;
      if (counts.rows % 5000 === 0) {
        console.log(`progress: ${counts.rows} rows processed...`);
      }
    }
    if (isHeader) {
      throw new Error("The FIPE CSV is empty.");
    }

    console.log(
      JSON.stringify({
        status: "succeeded",
        rowsProcessed: counts.rows,
        rowsSkipped: counts.skipped,
        brands: counts.brands.size,
        modelFamilies: counts.families.size,
        versions: counts.versions.size,
        years: counts.years.size,
      }),
    );
  } finally {
    await dbClient.end();
  }
}

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value || value.startsWith("${{")) {
    throw new Error(`${name} must be configured for the FIPE CSV import.`);
  }
  return value;
}

void main();
