import type {
  MarketplaceProviderAccountStatus,
  MarketplaceTokenSet,
} from "../../domains/marketplace/ports/marketplaceProviderGateway.js";
import type { HttpMarketplaceGatewayOptions } from "./httpMarketplaceProviderGatewayTypes.js";
import {
  baseUrl,
  expiresAt,
  MarketplaceProviderGatewayError,
  providerHttpError,
  readString,
} from "./httpMarketplaceProviderGatewaySupport.js";

export async function exchangeToken(
  fetchImpl: typeof fetch,
  options: HttpMarketplaceGatewayOptions,
  values: Record<string, string>,
): Promise<MarketplaceTokenSet> {
  const body = new URLSearchParams({
    client_id: options.auth.clientId,
    ...(options.auth.clientSecret
      ? { client_secret: options.auth.clientSecret }
      : {}),
    ...values,
  });
  const response = await fetchImpl(options.tokenUrl, {
    body,
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    method: "POST",
  });
  const payload = (await response.json()) as Record<string, unknown>;
  if (!response.ok) {
    throw providerHttpError(options.provider, response, payload, {
      tokenRefresh: values.grant_type === "refresh_token",
    });
  }
  const accessToken = readString(payload.access_token);
  if (!accessToken) {
    throw new MarketplaceProviderGatewayError(
      "MARKETPLACE_PROVIDER_VALIDATION_FAILED",
      "Marketplace provider returned an invalid token response.",
      options.provider,
      502,
      { provider: options.provider },
    );
  }
  return {
    accessToken,
    expiresAt: expiresAt(payload.expires_in),
    providerAccountId: readString(payload.user_id),
    refreshToken: readString(payload.refresh_token),
    scope: normalizeScope(payload.scope),
    tokenType: readString(payload.token_type),
  };
}

function normalizeScope(value: unknown): string | null {
  const values = Array.isArray(value)
    ? value
    : typeof value === "string"
      ? value.split(/[\s,]+/u)
      : [];
  const normalized = [
    ...new Set(
      values
        .filter((item): item is string => typeof item === "string")
        .map((item) => item.trim().toLowerCase())
        .filter(Boolean),
    ),
  ].sort();
  return normalized.length ? normalized.join(" ") : null;
}

export async function checkAccount(
  fetchImpl: typeof fetch,
  options: HttpMarketplaceGatewayOptions,
  token: MarketplaceTokenSet,
): Promise<MarketplaceProviderAccountStatus> {
  if (options.provider === "olx") assertOlxContract(options);
  const path =
    options.requirementConfig?.accountCheckPath ??
    options.accountPath ??
    "/users/me";
  if (options.provider === "olx") {
    return checkOlxAccount(fetchImpl, options, token, path);
  }
  const response = await fetchImpl(`${baseUrl(options)}${path}`, {
    headers: { Authorization: `Bearer ${token.accessToken}` },
    method: "GET",
  });
  const payload = (await response.json().catch(() => ({}))) as Record<
    string,
    unknown
  >;
  if (!response.ok)
    throw providerHttpError(options.provider, response, payload);
  return {
    accountId: readString(payload.id) ?? token.providerAccountId,
    requirements: [...(options.requirementConfig?.requirements ?? [])],
    status: "connected",
  };
}

async function checkOlxAccount(
  fetchImpl: typeof fetch,
  options: HttpMarketplaceGatewayOptions,
  token: MarketplaceTokenSet,
  path: string,
): Promise<MarketplaceProviderAccountStatus> {
  const response = await fetchImpl(`${baseUrl(options)}${path}`, {
    body: JSON.stringify({ access_token: token.accessToken }),
    headers: {
      "Content-Type": "application/json;charset=UTF-8",
      "User-Agent": "Mozilla/5.0",
    },
    method: "POST",
  });
  const payload = (await response.json().catch(() => ({}))) as Record<
    string,
    unknown
  >;
  if (!response.ok) {
    throw providerHttpError(options.provider, response, payload);
  }
  return {
    accountId:
      readString(payload.user_email) ??
      readString(payload.user_name) ??
      token.providerAccountId,
    requirements: [...(options.requirementConfig?.requirements ?? [])],
    status: "connected",
  };
}

export function assertOlxContract(options: HttpMarketplaceGatewayOptions) {
  if (!options.requirementConfig) {
    throw MarketplaceProviderGatewayError.contractMissing(options.provider);
  }
}
