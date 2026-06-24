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
import { createDrizzleVehicleCatalogRawResponseRecorder } from "../infrastructure/db/vehicleCatalog/drizzleVehicleCatalogRawResponses.js";
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
    ...(audit ? { audit: audit.sink } : {}),
  });
  let currentSyncRunId: string | null = null;
  const baseCatalogRepository = createDrizzleVehicleCatalogRepository(db);
  const catalogRepository = {
    ...baseCatalogRepository,
    async createSyncRun(
      input: Parameters<typeof baseCatalogRepository.createSyncRun>[0],
    ) {
      const run = await baseCatalogRepository.createSyncRun(input);
      currentSyncRunId = run.id;
      return run;
    },
    async finishSyncRun(
      input: Parameters<typeof baseCatalogRepository.finishSyncRun>[0],
    ) {
      await baseCatalogRepository.finishSyncRun(input);
      if (currentSyncRunId === input.runId) currentSyncRunId = null;
    },
  };
  const ports = {
    catalogProvider: createFipeVehicleCatalogProvider({
      ...(process.env.FIPE_API_BASE_URL
        ? { baseUrl: process.env.FIPE_API_BASE_URL }
        : {}),
      maxAttempts:
        parseOptionalPositiveInt("FIPE_CATALOG_SYNC_HTTP_MAX_ATTEMPTS") ?? 5,
      requestTimeoutMs:
        parseOptionalPositiveInt("FIPE_CATALOG_SYNC_HTTP_TIMEOUT_MS") ?? 30_000,
      retryBaseDelayMs:
        parseOptionalPositiveInt("FIPE_CATALOG_SYNC_HTTP_RETRY_BASE_MS") ??
        1_000,
      rawResponseRecorder: createDrizzleVehicleCatalogRawResponseRecorder(
        db,
        () => currentSyncRunId,
      ),
      ...(process.env.FIPE_API_TOKEN
        ? { token: process.env.FIPE_API_TOKEN }
        : {}),
    }),
    catalogRepository,
  };

  try {
    for (const vehicleType of parseVehicleTypes()) {
      await syncVehicleCatalog(
        context,
        {
          brandCodes: parseOptionalCsv("FIPE_CATALOG_SYNC_BRAND_CODES"),
          brandLimit: parseOptionalPositiveInt("FIPE_CATALOG_SYNC_BRAND_LIMIT"),
          concurrency: parseConcurrency(),
          referenceCode: parseOptionalString(
            "FIPE_CATALOG_SYNC_REFERENCE_CODE",
          ),
          refreshAfterDays:
            parseOptionalNonNegativeInt(
              "FIPE_CATALOG_SYNC_REFRESH_AFTER_DAYS",
            ) ?? 30,
          refreshExistingYears: parseBoolean(
            "FIPE_CATALOG_SYNC_REFRESH_EXISTING",
          ),
          syncYears: parseBooleanDefaultTrue("FIPE_CATALOG_SYNC_INCLUDE_YEARS"),
          vehicleType,
        },
        ports,
      );
    }
  } finally {
    await dbClient.end();
    await audit?.close();
  }
}

function createAuditSink() {
  const auditDatabaseUrl = process.env.AUDIT_DATABASE_URL;
  if (!auditDatabaseUrl) return undefined;
  const auditClient = postgres(auditDatabaseUrl, { max: 1 });
  const auditDb = drizzle(auditClient, { schema: auditSchema });
  return {
    close: () => auditClient.end(),
    sink: createDrizzleAuditSink(auditDb as unknown as DrizzleAuditSinkClient),
  };
}

function parseConcurrency(): number {
  const value = Number(process.env.FIPE_CATALOG_SYNC_CONCURRENCY ?? 1);
  return Number.isFinite(value) ? value : 1;
}

function parseOptionalPositiveInt(name: string): number | undefined {
  const raw = process.env[name];
  if (!raw) return undefined;
  const value = Number(raw);
  return Number.isInteger(value) && value > 0 ? value : undefined;
}

function parseOptionalNonNegativeInt(name: string): number | undefined {
  const raw = process.env[name];
  if (!raw) return undefined;
  const value = Number(raw);
  return Number.isInteger(value) && value >= 0 ? value : undefined;
}

function parseOptionalString(name: string): string | undefined {
  const value = process.env[name]?.trim();
  return value ? value : undefined;
}

function parseOptionalCsv(name: string): readonly string[] | undefined {
  const values = process.env[name]
    ?.split(",")
    .map((value) => value.trim())
    .filter(Boolean);
  return values?.length ? values : undefined;
}

function parseBoolean(name: string): boolean {
  return process.env[name] === "true";
}

function parseBooleanDefaultTrue(name: string): boolean {
  return process.env[name] !== "false";
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
