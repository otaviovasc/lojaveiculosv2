import * as schema from "@lojaveiculosv2/db";
import * as auditSchema from "@lojaveiculosv2/audit-db";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import {
  createInventoryListingServices,
  type InventoryListingServices,
} from "../../features/inventory/controllers/listingServices.js";
import type { CreateAppOptions } from "../http/createApp.js";
import {
  createDrizzleStoreAccessRepository,
  type DrizzleStoreAccessClient,
} from "./identity/drizzleStoreAccessRepository.js";
import {
  createDrizzlePublicStorefrontRepository,
  type DrizzlePublicStorefrontClient,
} from "./storefront/drizzlePublicStorefrontRepository.js";
import {
  createDrizzleAuditSink,
  type DrizzleAuditSinkClient,
} from "./audit/drizzleAuditSink.js";
import type { DrizzleVehicleInventoryClient } from "./vehicleInventory/drizzleVehicleInventoryRepository.js";

export function createRuntimeAppOptions(
  env: Record<string, string | undefined> = process.env,
): CreateAppOptions {
  const databaseUrl = env.DATABASE_URL;

  if (!databaseUrl || databaseUrl.startsWith("${{")) {
    if (!allowsMemoryRuntimeFallback(env)) {
      throw new RuntimeDatabaseConfigError(
        "DATABASE_URL must be configured before starting the API outside local/test.",
      );
    }

    return {};
  }

  const db = createProductDb(databaseUrl, env);
  const audit = createRuntimeAuditSink(env);

  return {
    ...(audit ? { audit } : {}),
    inventoryListingServices: createRuntimeInventoryServices(db),
    publicStorefrontRepository: createDrizzlePublicStorefrontRepository(
      db as unknown as DrizzlePublicStorefrontClient,
    ),
    storeAccessRepository: createDrizzleStoreAccessRepository(
      db as unknown as DrizzleStoreAccessClient,
    ),
  };
}

export class RuntimeDatabaseConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "RuntimeDatabaseConfigError";
  }
}

function allowsMemoryRuntimeFallback(
  env: Record<string, string | undefined>,
): boolean {
  return (
    env.APP_ENV === "local" ||
    env.NODE_ENV === "test" ||
    (!env.APP_ENV && env.NODE_ENV !== "production")
  );
}

function createProductDb(
  databaseUrl: string,
  env: Record<string, string | undefined>,
) {
  const client = postgres(databaseUrl, {
    max: Number(env.DB_POOL_MAX ?? 5),
  });

  return drizzle(client, { schema });
}

function createRuntimeAuditSink(env: Record<string, string | undefined>) {
  const auditDatabaseUrl = env.AUDIT_DATABASE_URL;

  if (!auditDatabaseUrl || auditDatabaseUrl.startsWith("${{")) {
    if (!allowsMemoryRuntimeFallback(env)) {
      throw new RuntimeDatabaseConfigError(
        "AUDIT_DATABASE_URL must be configured before starting DB-backed API runtime outside local/test.",
      );
    }

    return null;
  }

  const client = postgres(auditDatabaseUrl, {
    max: Number(env.AUDIT_DB_POOL_MAX ?? env.DB_POOL_MAX ?? 5),
  });
  const db = drizzle(client, { schema: auditSchema });

  return createDrizzleAuditSink(db as unknown as DrizzleAuditSinkClient);
}

function createRuntimeInventoryServices(db: unknown): InventoryListingServices {
  return createInventoryListingServices({
    drizzleClient: db as DrizzleVehicleInventoryClient,
  });
}
