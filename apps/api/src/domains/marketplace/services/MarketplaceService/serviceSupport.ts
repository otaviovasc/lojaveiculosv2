import { assertEntitlement } from "../../../../shared/authorization.js";
import type {
  ServiceContext,
  StoreScopedServiceContext,
} from "../../../../shared/serviceContext.js";
import type { MarketplaceRepository } from "../../ports/marketplaceRepository.js";
import type { MarketplaceProviderGatewayRegistry } from "../../ports/marketplaceProviderGateway.js";

export type MarketplaceServicePorts = {
  gatewayRegistry?: MarketplaceProviderGatewayRegistry;
  marketplaceRepository: MarketplaceRepository;
};

export class MarketplaceScopeError extends Error {
  constructor(fieldName: string) {
    super(`Marketplace service requires ${fieldName}.`);
    this.name = "MarketplaceScopeError";
  }
}

export class MarketplaceProviderRuntimeError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "MarketplaceProviderRuntimeError";
  }
}

export function requireMarketplaceScope(context: ServiceContext): {
  storeId: string;
  tenantId: string;
} {
  if (!context.storeId) throw new MarketplaceScopeError("storeId");
  if (!context.tenantId) throw new MarketplaceScopeError("tenantId");
  assertEntitlement(context as StoreScopedServiceContext, "marketplace");
  return { storeId: context.storeId, tenantId: context.tenantId };
}
