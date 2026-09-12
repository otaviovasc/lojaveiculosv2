import type { MarketplaceProvider } from "./types";

export type MarketplaceOauthCallback =
  | { code: string; kind: "inline"; state: string }
  | { error: string; kind: "inline-error"; state: string }
  | { kind: "none" }
  | {
      errorCode?: "MARKETPLACE_OAUTH_CALLBACK_FAILED";
      kind: "result-error";
      provider?: MarketplaceProvider;
      requestId?: string;
    }
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
  const errorCode =
    params.get("errorCode") === "MARKETPLACE_OAUTH_CALLBACK_FAILED"
      ? ("MARKETPLACE_OAUTH_CALLBACK_FAILED" as const)
      : undefined;
  const requestId = readSupportReference(params.get("requestId"));
  const transactionId = params.get("transactionId")?.trim();
  if (status === "pending" && provider && transactionId) {
    return { kind: "staged", provider, transactionId };
  }
  return {
    kind: "result-error",
    ...(errorCode ? { errorCode } : {}),
    ...(provider ? { provider } : {}),
    ...(requestId ? { requestId } : {}),
  };
}

function readProvider(value: string | null) {
  return value === "mercado_livre" || value === "olx" ? value : undefined;
}

function readSupportReference(value: string | null) {
  const normalized = value?.trim();
  return normalized && /^[A-Za-z0-9._:-]{1,128}$/u.test(normalized)
    ? normalized
    : undefined;
}
