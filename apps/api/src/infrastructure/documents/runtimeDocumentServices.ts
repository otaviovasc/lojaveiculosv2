import {
  createDocumentServices,
  type DocumentServices,
} from "../../features/documents/controllers/documentServices.js";
import type { DrizzleDocumentClient } from "../db/documents/drizzleDocumentRepository.js";
import type { ObjectStorage } from "../../shared/storage/objectStorage.js";
import { createMemoryObjectStorage } from "../storage/memoryObjectStorage.js";
import { createR2ObjectStorageFromEnv } from "../storage/r2ObjectStorage.js";
import {
  allowsMemoryRuntimeFallback,
  RuntimeDatabaseConfigError,
} from "../db/runtimeConfig.js";

export function createRuntimeDocumentServices(
  db: unknown,
  env: Record<string, string | undefined>,
  runtimeObjectStorage?: ObjectStorage | null,
): DocumentServices {
  const objectStorage =
    runtimeObjectStorage ?? createR2ObjectStorageFromEnv(env);
  if (!objectStorage && !allowsMemoryRuntimeFallback(env)) {
    throw new RuntimeDatabaseConfigError(
      "R2 object storage must be configured before document services start.",
    );
  }

  return createDocumentServices({
    drizzleClient: db as DrizzleDocumentClient,
    objectStorage: objectStorage ?? createMemoryObjectStorage(),
  });
}
