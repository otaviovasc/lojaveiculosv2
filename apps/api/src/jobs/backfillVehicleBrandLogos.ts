import * as productSchema from "@lojaveiculosv2/db";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { loadLocalEnv } from "../infrastructure/config/loadLocalEnv.js";
import { createDrizzleVehicleCatalogRepository } from "../infrastructure/db/vehicleCatalog/drizzleVehicleCatalogRepository.js";
import { createConsoleServiceLogger } from "../shared/serviceLogger.js";
import { backfillVehicleBrandLogos } from "./vehicleBrandLogoBackfill.js";

loadLocalEnv();

const logger = createConsoleServiceLogger({
  component: "job.backfill-vehicle-brand-logos",
  environment: process.env.APP_ENV ?? process.env.NODE_ENV ?? "unknown",
  service: "api",
});

async function main(): Promise<void> {
  const dbClient = postgres(requireEnv("DATABASE_URL"), { max: 2 });
  const db = drizzle(dbClient, { schema: productSchema });
  const repository = createDrizzleVehicleCatalogRepository(db);

  try {
    const result = await backfillVehicleBrandLogos(repository);
    logger.info("job.vehicle_brand_logos.completed", {
      status: "succeeded",
      ...result,
    });
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

void main().catch((error) => {
  logger.error("job.vehicle_brand_logos.failed", {
    errorMessage: error instanceof Error ? error.message : String(error),
    errorName: error instanceof Error ? error.name : "Error",
  });
  process.exitCode = 1;
});
