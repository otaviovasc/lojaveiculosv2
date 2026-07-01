import type {
  MarketplaceGatewayAuthConfig,
  MarketplaceProviderGateway,
  MarketplacePublishInput,
  MarketplacePublishResult,
  MarketplaceTokenSet,
} from "../../domains/marketplace/ports/marketplaceProviderGateway.js";
import type { MarketplaceProvider } from "../../domains/marketplace/ports/marketplaceRepository.js";
import { createProviderListingPayload } from "../../domains/marketplace/payloads/marketplaceListingPayload.js";

export type HttpMarketplaceGatewayOptions = {
  auth: MarketplaceGatewayAuthConfig;
  authorizationUrl?: string;
  baseUrl: string;
  fetch?: typeof fetch;
  listingPath?: string;
  provider: MarketplaceProvider;
  tokenUrl: string;
};

export function createHttpMarketplaceProviderGateway(
  options: HttpMarketplaceGatewayOptions,
): MarketplaceProviderGateway {
  const fetchImpl = options.fetch ?? fetch;

  return {
    async createAuthorizationUrl(input) {
      if (!options.authorizationUrl) {
        throw new MarketplaceProviderConfigError(options.provider);
      }
      const url = new URL(options.authorizationUrl);
      url.searchParams.set("response_type", "code");
      url.searchParams.set("client_id", options.auth.clientId);
      url.searchParams.set("redirect_uri", input.redirectUri);
      url.searchParams.set("state", input.state);
      return url.toString();
    },
    exchangeAuthorizationCode: async (input) =>
      exchangeToken(fetchImpl, options, {
        code: input.code,
        grant_type: "authorization_code",
        redirect_uri: input.redirectUri,
      }),
    provider: options.provider,
    refreshToken: async (refreshToken) =>
      exchangeToken(fetchImpl, options, {
        grant_type: "refresh_token",
        refresh_token: refreshToken,
      }),
    runListingSync: (input) => runListingSync(fetchImpl, options, input),
  };
}

async function exchangeToken(
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
  if (!response.ok)
    throw new MarketplaceProviderHttpError(response.status, payload);
  return {
    accessToken: readString(payload.access_token) ?? "",
    expiresAt: expiresAt(payload.expires_in),
    providerAccountId: readString(payload.user_id),
    refreshToken: readString(payload.refresh_token),
    scope: readString(payload.scope),
    tokenType: readString(payload.token_type),
  };
}

async function runListingSync(
  fetchImpl: typeof fetch,
  options: HttpMarketplaceGatewayOptions,
  input: MarketplacePublishInput,
): Promise<MarketplacePublishResult> {
  if (input.jobType === "listing_unpublish") {
    const { method, path } = requestShape(options, input);
    const response = await fetchImpl(
      `${options.baseUrl.replace(/\/$/, "")}${path}`,
      {
        headers: {
          Authorization: `Bearer ${input.token.accessToken}`,
          "Content-Type": "application/json",
        },
        method,
      },
    );
    const responsePayload = (await response.json().catch(() => ({}))) as Record<
      string,
      unknown
    >;
    if (!response.ok) {
      throw new MarketplaceProviderHttpError(response.status, responsePayload);
    }
    return {
      externalId: readString(responsePayload.id) ?? input.externalId ?? null,
      metadata: { providerResponse: responsePayload },
      providerStatus: readString(responsePayload.status) ?? "accepted",
    };
  }

  if (!input.listing) throw new MarketplaceProviderPayloadError(input.jobType);
  const payload = createProviderListingPayload({
    listing: input.listing,
    provider: options.provider,
    settings: input.metadata,
  });
  const { method, path } = requestShape(options, input);
  const requestInit: RequestInit = {
    headers: {
      Authorization: `Bearer ${input.token.accessToken}`,
      "Content-Type": "application/json",
    },
    method,
  };
  requestInit.body = JSON.stringify(payload.body);
  const response = await fetchImpl(
    `${options.baseUrl.replace(/\/$/, "")}${path}`,
    requestInit,
  );
  const responsePayload = (await response.json().catch(() => ({}))) as Record<
    string,
    unknown
  >;
  if (!response.ok) {
    throw new MarketplaceProviderHttpError(response.status, responsePayload);
  }
  return {
    externalId: readString(responsePayload.id) ?? input.externalId ?? null,
    metadata: {
      payloadAttributes: payload.attributes,
      providerResponse: responsePayload,
    },
    providerStatus: readString(responsePayload.status) ?? "accepted",
  };
}

function requestShape(
  options: HttpMarketplaceGatewayOptions,
  input: MarketplacePublishInput,
) {
  if (input.jobType === "listing_unpublish" && input.externalId) {
    return {
      method: "DELETE",
      path: `${listingPath(options)}/${input.externalId}`,
    };
  }
  if (input.externalId && input.jobType !== "listing_publish") {
    return {
      method: "PUT",
      path: `${listingPath(options)}/${input.externalId}`,
    };
  }
  return { method: "POST", path: listingPath(options) };
}

function listingPath(options: HttpMarketplaceGatewayOptions) {
  return (
    options.listingPath ??
    (options.provider === "mercado_livre" ? "/items" : "/listings")
  );
}

function expiresAt(value: unknown) {
  return typeof value === "number" ? new Date(Date.now() + value * 1000) : null;
}

function readString(value: unknown): string | null {
  if (typeof value === "number") return String(value);
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

export class MarketplaceProviderConfigError extends Error {
  constructor(provider: MarketplaceProvider) {
    super(`Marketplace provider ${provider} is not configured.`);
    this.name = "MarketplaceProviderConfigError";
  }
}

export class MarketplaceProviderHttpError extends Error {
  constructor(
    readonly status: number,
    readonly payload: Record<string, unknown>,
  ) {
    super(`Marketplace provider request failed with status ${status}.`);
    this.name = "MarketplaceProviderHttpError";
  }
}

export class MarketplaceProviderPayloadError extends Error {
  constructor(jobType: string) {
    super(`Marketplace listing payload is required for ${jobType}.`);
    this.name = "MarketplaceProviderPayloadError";
  }
}
