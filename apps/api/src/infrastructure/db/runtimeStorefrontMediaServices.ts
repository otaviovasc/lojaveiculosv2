import type { ObjectStorage } from "../../shared/storage/objectStorage.js";
import { createStorefrontMediaServices } from "../../features/storefront/controllers/storefrontMediaServices.js";
import {
  createDrizzleStorefrontMediaRepository,
  type DrizzleStorefrontMediaClient,
} from "./storefront/drizzleStorefrontMediaRepository.js";

export function createRuntimeStorefrontMediaServices(
  db: unknown,
  objectStorage: ObjectStorage | null,
) {
  return createStorefrontMediaServices({
    repository: createDrizzleStorefrontMediaRepository(
      db as DrizzleStorefrontMediaClient,
    ),
    ...(objectStorage ? { storage: objectStorage } : {}),
  });
}
