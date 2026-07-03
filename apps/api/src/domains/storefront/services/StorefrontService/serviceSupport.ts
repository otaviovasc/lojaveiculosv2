import type { PublicStorefrontRepository } from "../../ports/publicStorefrontRepository.js";
import type { StorefrontMediaRepository } from "../../ports/storefrontMediaRepository.js";
import type { StorefrontPageRepository } from "../../ports/storefrontPageRepository.js";
import type { ServiceContext } from "../../../../shared/serviceContext.js";
import type { ObjectStorage } from "../../../../shared/storage/objectStorage.js";

export class PublicStorefrontRepositoryError extends Error {
  constructor() {
    super("Public storefront repository port is not configured");
    this.name = "PublicStorefrontRepositoryError";
  }
}

export class PublicStorefrontNotFoundError extends Error {
  constructor(storeSlug: string) {
    super(`Public storefront not found: ${storeSlug}`);
    this.name = "PublicStorefrontNotFoundError";
  }
}

export class PublicStorefrontListingNotFoundError extends Error {
  constructor(listingSlug: string) {
    super(`Public storefront listing not found: ${listingSlug}`);
    this.name = "PublicStorefrontListingNotFoundError";
  }
}

export class StorefrontPageRepositoryError extends Error {
  constructor() {
    super("Storefront page repository port is not configured");
    this.name = "StorefrontPageRepositoryError";
  }
}

export class StorefrontPageNotFoundError extends Error {
  constructor(pageIdOrSlug: string) {
    super(`Storefront page not found: ${pageIdOrSlug}`);
    this.name = "StorefrontPageNotFoundError";
  }
}

export class StorefrontPageScopeError extends Error {
  constructor(fieldName: string) {
    super(`Storefront page service requires ${fieldName}.`);
    this.name = "StorefrontPageScopeError";
  }
}

export class StorefrontMediaRepositoryError extends Error {
  constructor() {
    super("Storefront media repository port is not configured");
    this.name = "StorefrontMediaRepositoryError";
  }
}

export class StorefrontMediaStorageError extends Error {
  constructor() {
    super("Storefront media object storage port is not configured");
    this.name = "StorefrontMediaStorageError";
  }
}

export class StorefrontMediaValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "StorefrontMediaValidationError";
  }
}

export function getPublicStorefrontRepository(
  repository?: PublicStorefrontRepository,
): PublicStorefrontRepository {
  if (repository) return repository;
  throw new PublicStorefrontRepositoryError();
}

export function getStorefrontPageRepository(
  repository?: StorefrontPageRepository,
): StorefrontPageRepository {
  if (repository) return repository;
  throw new StorefrontPageRepositoryError();
}

export function getStorefrontMediaRepository(
  repository?: StorefrontMediaRepository,
): StorefrontMediaRepository {
  if (repository) return repository;
  throw new StorefrontMediaRepositoryError();
}

export function getStorefrontMediaStorage(
  storage?: ObjectStorage,
): ObjectStorage {
  if (storage) return storage;
  throw new StorefrontMediaStorageError();
}

export function requireStorefrontPageScope(context: ServiceContext): {
  storeId: string;
  tenantId: string;
} {
  if (!context.storeId) throw new StorefrontPageScopeError("storeId");
  if (!context.tenantId) throw new StorefrontPageScopeError("tenantId");
  return { storeId: context.storeId, tenantId: context.tenantId };
}

export const requireStorefrontMediaScope = requireStorefrontPageScope;

export const storefrontMediaPermission = "store_public_site.manage";

const maxStorefrontMediaImageBytes = 15 * 1024 * 1024;

export type StorefrontMediaUploadInput = {
  contentType: string;
  fileName: string;
  height?: number | null;
  sizeBytes: number;
  width?: number | null;
};
type StorefrontMediaScopeInput = {
  storeId: string;
  tenantId: string;
};

export function validateStorefrontMediaUpload(
  input: StorefrontMediaUploadInput,
) {
  if (!input.contentType.startsWith("image/")) {
    throw new StorefrontMediaValidationError(
      "Storefront media uploads must be images.",
    );
  }
  if (input.sizeBytes < 1 || input.sizeBytes > maxStorefrontMediaImageBytes) {
    throw new StorefrontMediaValidationError(
      "Storefront media uploads must be between 1 byte and 15 MiB.",
    );
  }
}

export function createStorefrontMediaScopeSegments(
  scope: StorefrontMediaScopeInput,
) {
  return [
    "tenants",
    scope.tenantId,
    "stores",
    scope.storeId,
    "storefront",
    "media",
  ];
}

export function assertStorefrontMediaStorageKey(
  scope: StorefrontMediaScopeInput,
  storageKey: string,
) {
  const prefix = `${createStorefrontMediaScopeSegments(scope).join("/")}/`;
  if (!storageKey.startsWith(prefix)) {
    throw new StorefrontMediaValidationError(
      "Storefront media storage key does not belong to this store.",
    );
  }
}
