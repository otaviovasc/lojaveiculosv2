import type { MarketplaceProvider } from "./types";

export type MarketplaceOauthCallback =
  | { code: string; kind: "inline"; state: string }
  | { error: string; kind: "inline-error"; state: string }
  | { kind: "none" }
  | { kind: "result-error"; provider?: MarketplaceProvider }
  | {
      kind: "staged";
      provider: MarketplaceProvider;
      transactionId: string;
    };

export function readMarketplaceOauthCallback(
  location: Pick<Location, "pathname" | "search">,
): MarketplaceOauthCallback {
  const params = new URLSearchParams(location.search);
  if (location.pathname.startsWith("/marketplaces/oauth/callback")) {
    const state = params.get("state")?.trim();
    const error = params.get("error")?.trim();
    if (state && error) return { error, kind: "inline-error", state };
    const code = params.get("code")?.trim();
    return state && code
      ? { code, kind: "inline", state }
      : { kind: "result-error" };
  }

  const status = params.get("marketplaceOauth");
  if (!status) return { kind: "none" };
  const provider = readProvider(params.get("provider"));
  const transactionId = params.get("transactionId")?.trim();
  if (status === "pending" && provider && transactionId) {
    return { kind: "staged", provider, transactionId };
  }
  return {
    kind: "result-error",
    ...(provider ? { provider } : {}),
  };
}

function readProvider(value: string | null) {
  return value === "mercado_livre" || value === "olx" ? value : undefined;
}
