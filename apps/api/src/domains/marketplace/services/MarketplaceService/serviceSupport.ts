import { assertEntitlement } from "../../../../shared/authorization.js";
import type {
  ServiceContext,
  StoreScopedServiceContext,
} from "../../../../shared/serviceContext.js";
import type { MarketplaceRepository } from "../../ports/marketplaceRepository.js";
import type { MarketplaceProvider } from "../../ports/marketplaceRepository.js";
import type { MarketplaceOAuthStateStore } from "../../ports/marketplaceOAuthStateStore.js";
import type { MarketplaceProviderGatewayRegistry } from "../../ports/marketplaceProviderGateway.js";
import type { MarketplaceOlxCrmOnboarding } from "../../ports/marketplaceOlxCrmOnboarding.js";

export type MarketplaceServicePorts = {
  clock?: () => Date;
  gatewayRegistry?: MarketplaceProviderGatewayRegistry;
  marketplaceRepository: MarketplaceRepository;
  olxCrmOnboarding?: MarketplaceOlxCrmOnboarding;
  oauthRedirectUri?: (provider: MarketplaceProvider) => string;
  oauthStateStore?: MarketplaceOAuthStateStore;
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

export class MarketplaceOAuthStateInvalidError extends Error {
  constructor() {
    super("Marketplace OAuth state is invalid, expired, or already used.");
    this.name = "MarketplaceOAuthStateInvalidError";
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

export function requireMarketplaceOAuthPorts(ports: MarketplaceServicePorts) {
  if (!ports.oauthStateStore || !ports.oauthRedirectUri) {
    throw new MarketplaceProviderRuntimeError(
      "Marketplace OAuth runtime is not configured.",
    );
  }
  return {
    redirectUri: ports.oauthRedirectUri,
    stateStore: ports.oauthStateStore,
  };
}

export function marketplaceNow(ports: MarketplaceServicePorts) {
  return ports.clock?.() ?? new Date();
}
