import type {
  MarketplaceCatalogMapping,
  MarketplaceCatalogSnapshot,
  MarketplaceProvider,
} from "../ports/marketplaceRepository.js";
import type {
  MarketplaceProviderGateway,
  MarketplaceTokenSet,
} from "../ports/marketplaceProviderGateway.js";
import {
  isCatalogMappingResolvedForProvider,
  isCompleteCatalog,
} from "./MarketplaceService/marketplaceStockPlanRules.js";
import type { MarketplaceStockPlanItem } from "./MarketplaceService/marketplaceStockPlanTypes.js";
import type { MarketplaceServicePorts } from "./MarketplaceService/serviceSupport.js";

export function createCatalogMappingResolver(input: {
  gateway: MarketplaceProviderGateway | undefined;
  ports: MarketplaceServicePorts;
  provider: MarketplaceProvider;
  token: MarketplaceTokenSet | null;
}) {
  const cache = new Map<string, Promise<MarketplaceCatalogMapping | null>>();
  return (catalog: MarketplaceCatalogSnapshot | null) => {
    if (!catalog || catalog.source !== "fipe" || !isCompleteCatalog(catalog)) {
      return Promise.resolve(null);
    }
    const key = [
      catalog.vehicleType,
      catalog.brandCode,
      catalog.modelCode,
      catalog.fipeCode,
      catalog.yearCode,
    ].join(":");
    const existing = cache.get(key);
    if (existing) return existing;
    const resolution = resolveCatalogMapping({ ...input, catalog });
    cache.set(key, resolution);
    return resolution;
  };
}

export function providerMapping(
  mapping: MarketplaceCatalogMapping | null,
  provider: MarketplaceProvider,
): MarketplaceStockPlanItem["providerMapping"] {
  if (!mapping || !isCatalogMappingResolvedForProvider(mapping, provider)) {
    return null;
  }
  return {
    providerBrandCode: mapping.providerBrandCode!,
    providerModelCode: mapping.providerModelCode!,
    providerTrimCode: mapping.providerTrimCode!,
    providerYearCode: mapping.providerYearCode,
  };
}

async function resolveCatalogMapping(input: {
  catalog: MarketplaceCatalogSnapshot;
  gateway: MarketplaceProviderGateway | undefined;
  ports: MarketplaceServicePorts;
  provider: MarketplaceProvider;
  token: MarketplaceTokenSet | null;
}): Promise<MarketplaceCatalogMapping | null> {
  const persisted = await input.ports.marketplaceRepository.findCatalogMapping({
    catalog: input.catalog,
    provider: input.provider,
  });
  if (isCatalogMappingResolvedForProvider(persisted, input.provider)) {
    return persisted;
  }
  if (!input.gateway?.resolveCatalogMapping || !input.token) return persisted;
  const resolution = await input.gateway.resolveCatalogMapping({
    catalog: input.catalog,
    token: input.token,
  });
  return {
    fipeBrandCode: input.catalog.brandCode!,
    fipeCode: input.catalog.fipeCode!,
    fipeModelCode: input.catalog.modelCode!,
    fipeYearCode: input.catalog.yearCode!,
    provider: input.provider,
    ...resolution,
    vehicleType: input.catalog.vehicleType!,
  };
}
