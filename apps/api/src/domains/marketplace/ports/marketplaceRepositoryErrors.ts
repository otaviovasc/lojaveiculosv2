import type { MarketplaceProvider } from "./marketplaceRepository.js";

export class MarketplaceAccountMissingError extends Error {
  constructor(provider: MarketplaceProvider) {
    super(`Marketplace account is not configured for ${provider}.`);
    this.name = "MarketplaceAccountMissingError";
  }
}
