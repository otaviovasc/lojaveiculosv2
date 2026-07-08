import type {
  MarketplaceProviderGateway,
  MarketplaceProviderGatewayRegistry,
} from "../../domains/marketplace/ports/marketplaceProviderGateway.js";
import type { MarketplaceProvider } from "../../domains/marketplace/ports/marketplaceRepository.js";
import { createHttpMarketplaceProviderGateway } from "./httpMarketplaceProviderGateway.js";
import type { ProviderRequirementConfig } from "./httpMarketplaceProviderGatewayTypes.js";
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
  const clientSecret = env.OLX_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    return createFailClosedGateway(
      "olx",
      MarketplaceProviderGatewayError.notConfigured("olx"),
    );
  }
  const requirementConfig = resolveOlxRequirementConfig(
    env.OLX_REQUIREMENT_CONFIG,
  );
  if (!requirementConfig) {
    return createFailClosedGateway(
      "olx",
      MarketplaceProviderGatewayError.contractMissing("olx"),
    );
  }
  return createHttpMarketplaceProviderGateway({
    auth: {
      clientId,
      clientSecret,
    },
    authorizationScope: "autoupload basic_user_info autoservice chat",
    authorizationUrl:
      env.OLX_AUTHORIZATION_URL ?? "https://auth.olx.com.br/oauth",
    baseUrl: env.OLX_API_BASE_URL ?? "https://apps.olx.com.br",
    listingPath: env.OLX_LISTINGS_PATH ?? "/autoupload/import",
    provider: "olx",
    requirementConfig,
    tokenUrl: env.OLX_TOKEN_URL ?? "https://auth.olx.com.br/oauth/token",
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
    if (!isProviderRequirementConfig(parsed)) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

function resolveOlxRequirementConfig(value: string | undefined) {
  if (!value?.trim()) return defaultOlxRequirementConfig();
  return parseRequirementConfig(value);
}

function isProviderRequirementConfig(
  value: unknown,
): value is ProviderRequirementConfig {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const record = value as Record<string, unknown>;
  if (
    record.accountCheckPath !== undefined &&
    typeof record.accountCheckPath !== "string"
  ) {
    return false;
  }
  if (record.requirements === undefined) return true;
  if (!Array.isArray(record.requirements)) return false;
  return record.requirements.every((requirement) => {
    if (!requirement || typeof requirement !== "object") return false;
    const item = requirement as Record<string, unknown>;
    return (
      typeof item.code === "string" &&
      typeof item.message === "string" &&
      (item.severity === "blocked" ||
        item.severity === "ok" ||
        item.severity === "warning") &&
      typeof item.userAction === "string"
    );
  });
}

function defaultOlxRequirementConfig(): ProviderRequirementConfig {
  return {
    accountCheckPath: "/oauth_api/basic_user_info",
    requirements: [],
  };
}
