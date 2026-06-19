import * as auditSchema from "@lojaveiculosv2/audit-db";
import * as productSchema from "@lojaveiculosv2/db";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { syncVehicleCatalog } from "../domains/vehicle/services/VehicleCatalogService/syncVehicleCatalog.js";
import type { VehicleCatalogType } from "../domains/vehicle/ports/vehicleCatalogProvider.js";
import { createFipeVehicleCatalogProvider } from "../infrastructure/catalog/fipeVehicleCatalogProvider.js";
import {
  createDrizzleAuditSink,
  type DrizzleAuditSinkClient,
} from "../infrastructure/db/audit/drizzleAuditSink.js";
import { createDrizzleVehicleCatalogRepository } from "../infrastructure/db/vehicleCatalog/drizzleVehicleCatalogRepository.js";
import { loadLocalEnv } from "../infrastructure/config/loadLocalEnv.js";
import {
  createConsoleServiceLogger,
  createServiceContext,
} from "../shared/serviceContext.js";

loadLocalEnv();

const vehicleTypes = ["cars", "motorcycles", "trucks"] as const;

async function main(): Promise<void> {
  const databaseUrl = requireEnv("DATABASE_URL");
  const dbClient = postgres(databaseUrl, { max: 2 });
  const db = drizzle(dbClient, { schema: productSchema });
  const audit = createAuditSink();
  const context = createServiceContext({
    actor: { id: "vehicle_catalog_sync", kind: "system" },
    logger: createConsoleServiceLogger(),
    permissions: ["inventory.catalog_sync"],
    request: { requestId: `catalog_sync_${Date.now()}` },
    source: { component: "vehicle-catalog-cron", service: "api" },
    ...(audit ? { audit } : {}),
  });
  const ports = {
    catalogProvider: createFipeVehicleCatalogProvider({
      ...(process.env.FIPE_API_BASE_URL
        ? { baseUrl: process.env.FIPE_API_BASE_URL }
        : {}),
      ...(process.env.FIPE_API_TOKEN
        ? { token: process.env.FIPE_API_TOKEN }
        : {}),
    }),
    catalogRepository: createDrizzleVehicleCatalogRepository(db),
  };

  for (const vehicleType of parseVehicleTypes()) {
    await syncVehicleCatalog(
      context,
      {
        brandLimit: parseOptionalPositiveInt("FIPE_CATALOG_SYNC_BRAND_LIMIT"),
        concurrency: parseConcurrency(),
        vehicleType,
      },
      ports,
    );
  }

  await dbClient.end();
}

function createAuditSink() {
  const auditDatabaseUrl = process.env.AUDIT_DATABASE_URL;
  if (!auditDatabaseUrl) return undefined;
  const auditClient = postgres(auditDatabaseUrl, { max: 1 });
  const auditDb = drizzle(auditClient, { schema: auditSchema });
  return createDrizzleAuditSink(auditDb as unknown as DrizzleAuditSinkClient);
}

function parseConcurrency(): number {
  const value = Number(process.env.FIPE_CATALOG_SYNC_CONCURRENCY ?? 2);
  return Number.isFinite(value) ? value : 2;
}

function parseOptionalPositiveInt(name: string): number | undefined {
  const raw = process.env[name];
  if (!raw) return undefined;
  const value = Number(raw);
  return Number.isInteger(value) && value > 0 ? value : undefined;
}

function parseVehicleTypes(): readonly VehicleCatalogType[] {
  const configured = process.env.FIPE_CATALOG_SYNC_VEHICLE_TYPES;
  if (!configured) return ["cars"];
  return configured
    .split(",")
    .map((item) => item.trim())
    .filter(isVehicleCatalogType);
}

function isVehicleCatalogType(value: string): value is VehicleCatalogType {
  return vehicleTypes.includes(value as VehicleCatalogType);
}

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value || value.startsWith("${{")) {
    throw new Error(`${name} must be configured for vehicle catalog sync.`);
  }
  return value;
}

void main();
