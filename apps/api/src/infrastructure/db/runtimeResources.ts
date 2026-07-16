import * as schema from "@lojaveiculosv2/db";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres, { type Sql } from "postgres";
import { readDbCloseTimeoutSeconds } from "./runtimeConfig.js";
import { createDatabaseReadinessCheck } from "../runtime/readiness.js";

export type RuntimeResource = {
  close: () => Promise<void>;
  name: string;
};

export function createProductDb(
  databaseUrl: string,
  env: Record<string, string | undefined>,
) {
  const client = postgres(databaseUrl, {
    max: Number(env.DB_POOL_MAX ?? 5),
  });
  return {
    db: drizzle(client, { schema }),
    readinessCheck: createDatabaseReadinessCheck("productDatabase", client),
    resource: createPostgresResource("product-db", client, env),
  };
}

export function createIdempotentResource(
  resource: RuntimeResource,
): RuntimeResource {
  let closePromise: Promise<void> | null = null;

  return {
    name: resource.name,
    close: () => {
      closePromise ??= resource.close();
      return closePromise;
    },
  };
}

export async function closeRuntimeResources(
  resources: readonly RuntimeResource[],
): Promise<void> {
  const failures: Error[] = [];

  for (const resource of [...resources].reverse()) {
    try {
      await resource.close();
    } catch (error) {
      failures.push(
        new Error(`Failed to close runtime resource ${resource.name}.`, {
          cause: error,
        }),
      );
    }
  }

  if (failures.length > 0) {
    throw new AggregateError(failures, "Failed to close runtime resources.");
  }
}

function createPostgresResource(
  name: string,
  client: Sql,
  env: Record<string, string | undefined>,
): RuntimeResource {
  return createIdempotentResource({
    close: () => client.end({ timeout: readDbCloseTimeoutSeconds(env) }),
    name,
  });
}
