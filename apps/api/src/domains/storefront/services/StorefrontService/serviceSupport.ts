import type { PublicStorefrontRepository } from "../../ports/publicStorefrontRepository.js";
import type { StorefrontPageRepository } from "../../ports/storefrontPageRepository.js";
import type { ServiceContext } from "../../../../shared/serviceContext.js";

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

export function requireStorefrontPageScope(context: ServiceContext): {
  storeId: string;
  tenantId: string;
} {
  if (!context.storeId) throw new StorefrontPageScopeError("storeId");
  if (!context.tenantId) throw new StorefrontPageScopeError("tenantId");
  return { storeId: context.storeId, tenantId: context.tenantId };
}
