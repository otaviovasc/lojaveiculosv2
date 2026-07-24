import { createReadStream } from "node:fs";
import { createInterface } from "node:readline";
import * as productSchema from "@lojaveiculosv2/db";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { splitVehicleCatalogName } from "../domains/vehicle/catalog/catalogNameNormalization.js";
import type { VehicleCatalogType } from "../domains/vehicle/ports/vehicleCatalogProvider.js";
import { parseFipePriceCents } from "../infrastructure/catalog/fipeVehicleCatalogMapping.js";
import { loadLocalEnv } from "../infrastructure/config/loadLocalEnv.js";
import { createDrizzleVehicleCatalogWrites } from "../infrastructure/db/vehicleCatalog/drizzleVehicleCatalogWrites.js";

loadLocalEnv();

const csvPath =
  process.env.FIPE_CSV_PATH ??
  new URL("../../../../../tabela-fipe-335.csv", import.meta.url).pathname;

const vehicleTypeByCode: Record<string, VehicleCatalogType> = {
  CAR: "cars",
  MOTO: "motorcycles",
  MOTORCYCLE: "motorcycles",
  TRUCK: "trucks",
};

type CsvRow = {
  brandCode: string;
  brandValue: string;
  fipeCode: string;
  fuelType: string;
  modelCode: string;
  modelValue: string;
  month: string;
  price: string;
  type: string;
  yearCode: string;
  yearValue: string;
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
        isHeader = false;
        continue;
      }
      const row = parseRow(line);
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

      const modelYear = Number.parseInt(row.yearCode.slice(0, 4), 10);
      await writes.upsertYear({
        code: row.yearCode,
        fuelCode: row.yearCode.includes("-")
          ? (row.yearCode.split("-")[1] ?? null)
          : null,
        modelYear: Number.isFinite(modelYear) ? modelYear : null,
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
        modelYear: Number.isFinite(modelYear) ? modelYear : null,
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

function parseRow(line: string): CsvRow | null {
  const fields = parseCsvLine(line);
  if (fields.length < 12) return null;
  const [
    type,
    brandCode,
    brandValue,
    modelCode,
    modelValue,
    yearCode,
    yearValue,
    fipeCode,
    _fuelLetter,
    fuelType,
    price,
    month,
  ] = fields;
  if (!type || !brandCode || !modelCode || !yearCode) return null;
  return {
    brandCode,
    brandValue: brandValue ?? "",
    fipeCode: fipeCode ?? "",
    fuelType: fuelType ?? "",
    modelCode,
    modelValue: modelValue ?? "",
    month: month ?? "",
    price: price ?? "",
    type,
    yearCode,
    yearValue: yearValue ?? "",
  };
}

function parseCsvLine(line: string): string[] {
  const fields: string[] = [];
  let current = "";
  let inQuotes = false;
  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    if (inQuotes) {
      if (char === '"') {
        if (line[index + 1] === '"') {
          current += '"';
          index += 1;
        } else {
          inQuotes = false;
        }
      } else {
        current += char;
      }
    } else if (char === '"') {
      inQuotes = true;
    } else if (char === ",") {
      fields.push(current);
      current = "";
    } else {
      current += char;
    }
  }
  fields.push(current);
  return fields;
}

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value || value.startsWith("${{")) {
    throw new Error(`${name} must be configured for the FIPE CSV import.`);
  }
  return value;
}

void main();
