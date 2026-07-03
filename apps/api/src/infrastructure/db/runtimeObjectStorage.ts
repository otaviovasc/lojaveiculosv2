import type { ObjectStorage } from "../../shared/storage/objectStorage.js";
import { createMemoryObjectStorage } from "../storage/memoryObjectStorage.js";
import { createR2ObjectStorageFromEnv } from "../storage/r2ObjectStorage.js";
import { allowsMemoryRuntimeFallback } from "./runtimeConfig.js";

export function createRuntimeObjectStorage(
  env: Record<string, string | undefined>,
): ObjectStorage | null {
  const objectStorage = createR2ObjectStorageFromEnv(env);
  if (objectStorage) return objectStorage;
  return allowsMemoryRuntimeFallback(env) ? createMemoryObjectStorage() : null;
}
