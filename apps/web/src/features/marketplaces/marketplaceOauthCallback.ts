import type { MarketplaceProvider } from "./types";

export type MarketplaceOauthCallback =
  | { code: string; kind: "success"; provider: MarketplaceProvider }
  | { kind: "error"; message: string; provider?: MarketplaceProvider }
  | { kind: "none" };

export function marketplaceRedirectUri(location: Pick<Location, "origin">) {
  return `${location.origin}/marketplaces/oauth/callback`;
}

export function readMarketplaceOauthCallback(
  location: Pick<Location, "pathname" | "search">,
): MarketplaceOauthCallback {
  if (!location.pathname.startsWith("/marketplaces/oauth/callback")) {
    return { kind: "none" };
  }

  const params = new URLSearchParams(location.search);
  const provider = readProviderFromState(params.get("state"));
  const providerError = params.get("error_description") ?? params.get("error");
  if (providerError) {
    return {
      kind: "error",
      message:
        "A autorização foi cancelada ou recusada pelo canal. Nenhuma conta foi conectada.",
      ...(provider ? { provider } : {}),
    };
  }

  const code = params.get("code")?.trim();
  if (!code || !provider) {
    return {
      kind: "error",
      message:
        "O canal não devolveu os dados necessários para concluir a conexão.",
      ...(provider ? { provider } : {}),
    };
  }

  return { code, kind: "success", provider };
}

function readProviderFromState(value: string | null) {
  if (!value) return undefined;
  try {
    const state = JSON.parse(value) as { provider?: unknown };
    return isMarketplaceProvider(state.provider) ? state.provider : undefined;
  } catch {
    return undefined;
  }
}

function isMarketplaceProvider(value: unknown): value is MarketplaceProvider {
  return value === "mercado_livre" || value === "olx";
}
