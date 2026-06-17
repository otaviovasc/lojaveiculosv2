import type { PublicStorefrontRepository } from "../../../domains/storefront/ports/publicStorefrontRepository.js";

export function createMemoryPublicStorefrontRepository(): PublicStorefrontRepository {
  return {
    async findPublicStoreBySlug() {
      return null;
    },
    async listPublicListings() {
      return [];
    },
  };
}
