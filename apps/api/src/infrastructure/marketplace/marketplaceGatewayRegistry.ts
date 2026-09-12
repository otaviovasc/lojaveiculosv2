import type {
  MarketplaceProviderGateway,
  MarketplaceProviderGatewayRegistry,
} from "../../domains/marketplace/ports/marketplaceProviderGateway.js";
import type { MarketplaceProvider } from "../../domains/marketplace/ports/marketplaceRepository.js";
import { createHttpMarketplaceProviderGateway } from "./httpMarketplaceProviderGateway.js";
import { MarketplaceProviderGatewayError } from "./httpMarketplaceProviderGatewaySupport.js";

export function createMarketplaceGatewayRegistry(
  env: Record<string, string | undefined> = process.env,
): MarketplaceProviderGatewayRegistry {
  const gateways = new Map<MarketplaceProvider, MarketplaceProviderGateway>();
  const mercadoLivre = createMercadoLivreGateway(env);
  gateways.set("mercado_livre", mercadoLivre);
  gateways.set("olx", createOlxGateway(env));

  return {
    getGateway(provider) {
      const gateway = gateways.get(provider);
      if (!gateway) throw new Error(`Marketplace gateway missing: ${provider}`);
      return gateway;
    },
  };
}

function createMercadoLivreGateway(env: Record<string, string | undefined>) {
  const clientId = env.MERCADO_LIVRE_CLIENT_ID;
  if (!clientId) {
    return createFailClosedGateway(
      "mercado_livre",
      MarketplaceProviderGatewayError.notConfigured("mercado_livre"),
    );
  }
  return createHttpMarketplaceProviderGateway({
    auth: {
      clientId,
      ...(env.MERCADO_LIVRE_CLIENT_SECRET
        ? { clientSecret: env.MERCADO_LIVRE_CLIENT_SECRET }
        : {}),
    },
    authorizationUrl:
      env.MERCADO_LIVRE_AUTHORIZATION_URL ??
      "https://auth.mercadolivre.com.br/authorization",
    baseUrl: env.MERCADO_LIVRE_API_BASE_URL ?? "https://api.mercadolibre.com",
    accountPath: env.MERCADO_LIVRE_ACCOUNT_PATH ?? "/users/me",
    provider: "mercado_livre",
    tokenUrl:
      env.MERCADO_LIVRE_TOKEN_URL ?? "https://api.mercadolibre.com/oauth/token",
  });
}

function createOlxGateway(env: Record<string, string | undefined>) {
  const clientId = env.OLX_CLIENT_ID;
  const clientSecret = env.OLX_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    return createFailClosedGateway(
      "olx",
      MarketplaceProviderGatewayError.notConfigured("olx"),
    );
  }
  return createHttpMarketplaceProviderGateway({
    auth: {
      clientId,
      clientSecret,
    },
    authorizationScope: "basic_user_info autoupload autoservice chat",
    authorizationUrl: "https://auth.olx.com.br/oauth",
    baseUrl: "https://apps.olx.com.br",
    listingPath: "/autoupload/import",
    provider: "olx",
    requirementConfig: {
      accountCheckPath: "/oauth_api/basic_user_info",
      requirements: [],
    },
    tokenUrl: "https://auth.olx.com.br/oauth/token",
  });
}

function createFailClosedGateway(
  provider: MarketplaceProvider,
  error: MarketplaceProviderGatewayError,
): MarketplaceProviderGateway {
  return {
    checkAccount: async () => {
      throw error;
    },
    createAuthorizationUrl: async () => {
      throw error;
    },
    exchangeAuthorizationCode: async () => {
      throw error;
    },
    provider,
    refreshToken: async () => {
      throw error;
    },
    runListingSync: async () => {
      throw error;
    },
  };
}
