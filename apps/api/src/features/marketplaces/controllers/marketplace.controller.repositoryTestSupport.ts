import type { MarketplaceRepository } from "../../../domains/marketplace/ports/marketplaceRepository.js";
import { createResolvedMarketplaceCatalogMapping } from "../../../domains/marketplace/testSupportMarketplaceRepository.js";

export function resolvedMarketplaceTestRepository(
  repository: MarketplaceRepository,
): MarketplaceRepository {
  return {
    ...repository,
    findCatalogMapping: async (input) =>
      createResolvedMarketplaceCatalogMapping(input.provider),
  };
}
