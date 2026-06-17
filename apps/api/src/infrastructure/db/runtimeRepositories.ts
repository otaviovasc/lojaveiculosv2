import * as schema from "@lojaveiculosv2/db";
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

  return {
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

function createRuntimeInventoryServices(db: unknown): InventoryListingServices {
  return createInventoryListingServices({
    drizzleClient: db as DrizzleVehicleInventoryClient,
  });
}
