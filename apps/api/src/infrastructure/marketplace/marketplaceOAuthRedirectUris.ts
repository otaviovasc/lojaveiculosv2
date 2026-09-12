import type { MarketplaceProvider } from "../../domains/marketplace/ports/marketplaceRepository.js";

export const olxOAuthCallbackPath = "/api/v1/marketplaces/oauth/olx/callback";

export function createMarketplaceOAuthRedirectUriResolver(
  env: Record<string, string | undefined>,
) {
  return (provider: MarketplaceProvider) => {
    if (provider === "olx") {
      return olxOAuthRedirectUri(env);
    }
    return mercadoLivreRedirectUri(env);
  };
}

function olxOAuthRedirectUri(env: Record<string, string | undefined>) {
  const publicAppUrl = env.PUBLIC_APP_URL?.trim();
  if (!publicAppUrl) {
    throw new Error("PUBLIC_APP_URL must be configured for OLX OAuth.");
  }
  const publicOrigin = new URL(publicAppUrl);
  if (publicOrigin.username || publicOrigin.password) {
    throw new Error("PUBLIC_APP_URL must not contain credentials.");
  }
  const loopback = isLoopbackHostname(publicOrigin.hostname);
  if (publicOrigin.protocol === "http:") {
    if (!isLocalRuntime(env) || !loopback) {
      throw new Error(
        "PUBLIC_APP_URL may use HTTP only for a loopback local or test origin.",
      );
    }
  } else if (
    publicOrigin.protocol !== "https:" ||
    (!isLocalRuntime(env) && loopback)
  ) {
    throw new Error("PUBLIC_APP_URL must be a public HTTPS origin.");
  }
  const url = new URL(olxOAuthCallbackPath, publicOrigin.origin);
  url.hash = "";
  url.search = "";
  return url.toString();
}

function isLoopbackHostname(hostname: string) {
  return (
    hostname === "localhost" ||
    hostname.endsWith(".localhost") ||
    hostname === "127.0.0.1" ||
    hostname === "[::1]"
  );
}

function mercadoLivreRedirectUri(env: Record<string, string | undefined>) {
  const publicAppUrl = env.PUBLIC_APP_URL?.trim();
  if (!publicAppUrl) {
    throw new Error(
      "PUBLIC_APP_URL must be configured for Mercado Livre OAuth.",
    );
  }
  const url = new URL("/marketplaces/oauth/callback", publicAppUrl);
  url.hash = "";
  url.search = "";
  return url.toString();
}

function isLocalRuntime(env: Record<string, string | undefined>) {
  const appEnvironment = env.APP_ENV?.trim().toLowerCase();
  if (appEnvironment) {
    return appEnvironment === "local" || appEnvironment === "test";
  }
  return env.NODE_ENV === "development" || env.NODE_ENV === "test";
}
