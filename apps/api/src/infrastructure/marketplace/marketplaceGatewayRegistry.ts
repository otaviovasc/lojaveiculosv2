import type {
  MarketplaceProviderGateway,
  MarketplaceProviderGatewayRegistry,
} from "../../domains/marketplace/ports/marketplaceProviderGateway.js";
import type { MarketplaceProvider } from "../../domains/marketplace/ports/marketplaceRepository.js";
import { createHttpMarketplaceProviderGateway } from "./httpMarketplaceProviderGateway.js";

export function createMarketplaceGatewayRegistry(
  env: Record<string, string | undefined> = process.env,
): MarketplaceProviderGatewayRegistry {
  const gateways = new Map<MarketplaceProvider, MarketplaceProviderGateway>();
  const mercadoLivre = createMercadoLivreGateway(env);
  if (mercadoLivre) gateways.set("mercado_livre", mercadoLivre);
  const olx = createOlxGateway(env);
  if (olx) gateways.set("olx", olx);

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
    provider: "mercado_livre",
    tokenUrl:
      env.MERCADO_LIVRE_TOKEN_URL ?? "https://api.mercadolibre.com/oauth/token",
  });
}

function createOlxGateway(env: Record<string, string | undefined>) {
  const clientId = env.OLX_CLIENT_ID;
  const baseUrl = env.OLX_API_BASE_URL;
  const tokenUrl = env.OLX_TOKEN_URL;
  if (!clientId || !baseUrl || !tokenUrl) return null;
  return createHttpMarketplaceProviderGateway({
    auth: {
      clientId,
      ...(env.OLX_CLIENT_SECRET ? { clientSecret: env.OLX_CLIENT_SECRET } : {}),
    },
    ...(env.OLX_AUTHORIZATION_URL
      ? { authorizationUrl: env.OLX_AUTHORIZATION_URL }
      : {}),
    baseUrl,
    ...(env.OLX_LISTINGS_PATH ? { listingPath: env.OLX_LISTINGS_PATH } : {}),
    provider: "olx",
    tokenUrl,
  });
}
