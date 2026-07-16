import type { CreateAppOptions } from "../http/createApp.js";
import { validateR2ObjectStorageEnv } from "../storage/r2ObjectStorage.js";
import { createRuntimeHttpAppOptions } from "./runtimeAppOptions.js";
import { createRuntimeCrmRealtimeBroker } from "../crm/redisCrmRealtimeBroker.js";
import {
  assertRuntimeIdentityVerifierConfig,
  allowsMemoryRuntimeFallback,
  createAuditDb,
  createRuntimeClerkAccountProviders,
  createRuntimeIdentityVerifier,
  resolveRuntimeDatabaseUrl,
  RuntimeDatabaseConfigError,
} from "./runtimeConfig.js";
import {
  closeRuntimeResources,
  createIdempotentResource,
  createProductDb,
  type RuntimeResource,
} from "./runtimeResources.js";
import { createRuntimeObjectStorage } from "./runtimeObjectStorage.js";
import {
  createReadinessProbe,
  readReadinessTimeoutMs,
} from "../runtime/readiness.js";

export { RuntimeDatabaseConfigError } from "./runtimeConfig.js";
export type { RuntimeResource } from "./runtimeResources.js";

export type RuntimeAppDependencies = {
  appOptions: CreateAppOptions;
  close: () => Promise<void>;
  resources: readonly RuntimeResource[];
};

export function createRuntimeAppOptions(
  env: Record<string, string | undefined> = process.env,
): CreateAppOptions {
  const runtime = createRuntimeAppDependencies(env);
  if (runtime.resources.length > 0) {
    void runtime.close().catch(() => undefined);
    throw new RuntimeDatabaseConfigError(
      "createRuntimeAppOptions cannot manage DB-backed runtime resources; use createRuntimeAppDependencies.",
    );
  }
  return runtime.appOptions;
}

export function createRuntimeAppDependencies(
  env: Record<string, string | undefined> = process.env,
): RuntimeAppDependencies {
  const databaseUrl = resolveRuntimeDatabaseUrl(
    env,
    "DATABASE_URL",
    "DATABASE_URL must be configured before starting the API outside local/test.",
  );

  if (!databaseUrl) {
    return {
      appOptions: {},
      close: async () => undefined,
      resources: [],
    };
  }

  resolveRuntimeDatabaseUrl(
    env,
    "AUDIT_DATABASE_URL",
    "AUDIT_DATABASE_URL must be configured before starting DB-backed API runtime outside local/test.",
  );
  assertRuntimeIdentityVerifierConfig(env);
  assertRuntimeObjectStorageConfig(env);

  const productDb = createProductDb(databaseUrl, env);
  const auditDatabase = createAuditDb(env);
  const objectStorage = createRuntimeObjectStorage(env);
  const crmRealtimeBroker = createRuntimeCrmRealtimeBroker(env);
  const closeCrmRealtimeBroker =
    "close" in crmRealtimeBroker &&
    typeof crmRealtimeBroker.close === "function"
      ? (crmRealtimeBroker.close as () => Promise<void>)
      : null;
  const clerkAccountProviders = createRuntimeClerkAccountProviders(env);
  const resources: RuntimeResource[] = [
    productDb.resource,
    ...(auditDatabase
      ? [
          createIdempotentResource({
            close: auditDatabase.close,
            name: auditDatabase.name,
          }),
        ]
      : []),
    ...(objectStorage?.close
      ? [
          createIdempotentResource({
            close: async () => objectStorage.close?.(),
            name: "object-storage",
          }),
        ]
      : []),
    ...(closeCrmRealtimeBroker
      ? [
          createIdempotentResource({
            close: closeCrmRealtimeBroker,
            name: "crm-realtime-broker",
          }),
        ]
      : []),
  ];

  try {
    const readiness = createReadinessProbe(
      [
        productDb.readinessCheck,
        ...(auditDatabase ? [auditDatabase.readinessCheck] : []),
      ],
      readReadinessTimeoutMs(env),
    );
    return {
      appOptions: {
        ...createRuntimeHttpAppOptions({
          auditDb: auditDatabase?.db ?? null,
          clerkAccountProviders,
          crmRealtimeBroker,
          db: productDb.db,
          env,
          identityVerifier: createRuntimeIdentityVerifier(env),
          objectStorage,
        }),
        readiness,
      },
      close: () => closeRuntimeResources(resources),
      resources,
    };
  } catch (error) {
    void closeRuntimeResources(resources).catch(() => undefined);
    throw error;
  }
}

function assertRuntimeObjectStorageConfig(
  env: Record<string, string | undefined>,
): void {
  const hasObjectStorage = validateR2ObjectStorageEnv(env);
  if (!hasObjectStorage && !allowsMemoryRuntimeFallback(env)) {
    throw new RuntimeDatabaseConfigError(
      "R2 object storage must be configured before document services start.",
    );
  }
}
