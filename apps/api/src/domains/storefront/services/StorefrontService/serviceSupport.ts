import type { PublicStorefrontRepository } from "../../ports/publicStorefrontRepository.js";

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

export function getPublicStorefrontRepository(
  repository?: PublicStorefrontRepository,
): PublicStorefrontRepository {
  if (repository) return repository;
  throw new PublicStorefrontRepositoryError();
}
