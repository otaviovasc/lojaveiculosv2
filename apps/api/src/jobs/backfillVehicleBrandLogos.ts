import * as productSchema from "@lojaveiculosv2/db";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { loadLocalEnv } from "../infrastructure/config/loadLocalEnv.js";
import { createDrizzleVehicleCatalogRepository } from "../infrastructure/db/vehicleCatalog/drizzleVehicleCatalogRepository.js";
import { backfillVehicleBrandLogos } from "./vehicleBrandLogoBackfill.js";

loadLocalEnv();

async function main(): Promise<void> {
  const dbClient = postgres(requireEnv("DATABASE_URL"), { max: 2 });
  const db = drizzle(dbClient, { schema: productSchema });
  const repository = createDrizzleVehicleCatalogRepository(db);

  try {
    const result = await backfillVehicleBrandLogos(repository);
    console.log(JSON.stringify({ status: "succeeded", ...result }, null, 2));
  } finally {
    await dbClient.end();
  }
}

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value || value.startsWith("${{")) {
    throw new Error(`${name} must be configured for the brand logo backfill.`);
  }
  return value;
}

void main();
