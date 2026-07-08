import type {
  MarketplaceProviderGateway,
  MarketplaceProviderGatewayRegistry,
} from "../../domains/marketplace/ports/marketplaceProviderGateway.js";
import type { MarketplaceProvider } from "../../domains/marketplace/ports/marketplaceRepository.js";
import {
  createHttpMarketplaceProviderGateway,
  type ProviderRequirementConfig,
} from "./httpMarketplaceProviderGateway.js";
import { MarketplaceProviderGatewayError } from "./httpMarketplaceProviderGatewaySupport.js";

export function createMarketplaceGatewayRegistry(
  env: Record<string, string | undefined> = process.env,
): MarketplaceProviderGatewayRegistry {
  const gateways = new Map<MarketplaceProvider, MarketplaceProviderGateway>();
  const mercadoLivre = createMercadoLivreGateway(env);
  if (mercadoLivre) gateways.set("mercado_livre", mercadoLivre);
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
  if (!clientId) return null;
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
  const authorizationUrl = env.OLX_AUTHORIZATION_URL;
  const baseUrl = env.OLX_API_BASE_URL;
  const listingPath = env.OLX_LISTINGS_PATH;
  const tokenUrl = env.OLX_TOKEN_URL;
  if (!clientId || !authorizationUrl || !baseUrl || !listingPath || !tokenUrl) {
    return createFailClosedGateway(
      "olx",
      MarketplaceProviderGatewayError.notConfigured("olx"),
    );
  }
  const requirementConfig = parseRequirementConfig(env.OLX_REQUIREMENT_CONFIG);
  if (!requirementConfig) {
    return createFailClosedGateway(
      "olx",
      MarketplaceProviderGatewayError.contractMissing("olx"),
    );
  }
  return createHttpMarketplaceProviderGateway({
    auth: {
      clientId,
      ...(env.OLX_CLIENT_SECRET ? { clientSecret: env.OLX_CLIENT_SECRET } : {}),
    },
    authorizationUrl,
    baseUrl,
    listingPath,
    provider: "olx",
    requirementConfig,
    tokenUrl,
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

function parseRequirementConfig(
  value: string | undefined,
): ProviderRequirementConfig | null {
  if (!value) return null;
  try {
    const parsed = JSON.parse(value) as unknown;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return null;
    }
    return parsed as ProviderRequirementConfig;
  } catch {
    return null;
  }
}
