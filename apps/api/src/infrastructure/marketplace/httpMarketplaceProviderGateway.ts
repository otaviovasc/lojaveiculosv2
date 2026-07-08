import type {
  MarketplaceGatewayAuthConfig,
  MarketplaceProviderGateway,
  MarketplacePublishInput,
  MarketplacePublishResult,
  MarketplaceServiceErrorCode,
} from "../../domains/marketplace/ports/marketplaceProviderGateway.js";
import type { MarketplaceProvider } from "../../domains/marketplace/ports/marketplaceRepository.js";
import { createProviderListingPayload } from "../../domains/marketplace/payloads/marketplaceListingPayload.js";
import {
  assertOlxContract,
  checkAccount,
  exchangeToken,
} from "./httpMarketplaceProviderGatewayAuth.js";
import {
  baseUrl,
  duplicateExternalId,
  MarketplaceProviderGatewayError,
  MarketplaceProviderPayloadError,
  providerHttpError,
  readString,
  sanitizedResult,
} from "./httpMarketplaceProviderGatewaySupport.js";

export type HttpMarketplaceGatewayOptions = {
  auth: MarketplaceGatewayAuthConfig;
  authorizationUrl?: string;
  baseUrl: string;
  fetch?: typeof fetch;
  accountPath?: string;
  listingPath?: string;
  requirementConfig?: ProviderRequirementConfig;
  provider: MarketplaceProvider;
  tokenUrl: string;
};

export type ProviderRequirementConfig = {
  accountCheckPath?: string;
  requirements?: readonly {
    code: MarketplaceServiceErrorCode;
    message: string;
    severity: "blocked" | "ok" | "warning";
    userAction: string;
  }[];
};

export function createHttpMarketplaceProviderGateway(
  options: HttpMarketplaceGatewayOptions,
): MarketplaceProviderGateway {
  const fetchImpl = options.fetch ?? fetch;

  return {
    checkAccount: async (input) =>
      checkAccount(fetchImpl, options, input.token),
    async createAuthorizationUrl(input) {
      if (!options.authorizationUrl) {
        throw MarketplaceProviderGatewayError.notConfigured(options.provider);
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

async function runListingSync(
  fetchImpl: typeof fetch,
  options: HttpMarketplaceGatewayOptions,
  input: MarketplacePublishInput,
): Promise<MarketplacePublishResult> {
  if (options.provider === "olx") assertOlxContract(options);
  if (input.jobType === "listing_unpublish") {
    const { method, path } = requestShape(options, input);
    const response = await fetchImpl(`${baseUrl(options)}${path}`, {
      headers: {
        Authorization: `Bearer ${input.token.accessToken}`,
        "Content-Type": "application/json",
      },
      method,
    });
    const responsePayload = (await response.json().catch(() => ({}))) as Record<
      string,
      unknown
    >;
    if (!response.ok) {
      throw providerHttpError(options.provider, response, responsePayload);
    }
    const externalId =
      readString(responsePayload.id) ?? input.externalId ?? null;
    const providerStatus = readString(responsePayload.status) ?? "accepted";
    return {
      externalId,
      metadata: sanitizedResult(externalId, response, providerStatus),
      providerStatus,
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
  const response = await fetchImpl(`${baseUrl(options)}${path}`, requestInit);
  const responsePayload = (await response.json().catch(() => ({}))) as Record<
    string,
    unknown
  >;
  if (!response.ok) {
    if (response.status === 409 && input.jobType === "listing_publish") {
      const duplicateId =
        duplicateExternalId(responsePayload) ?? input.externalId;
      if (duplicateId) {
        return updateDuplicateListing(
          fetchImpl,
          options,
          input,
          duplicateId,
          payload,
        );
      }
    }
    throw providerHttpError(options.provider, response, responsePayload);
  }
  const externalId = readString(responsePayload.id) ?? input.externalId ?? null;
  const providerStatus = readString(responsePayload.status) ?? "accepted";
  return {
    externalId,
    metadata: {
      providerRequest: payload.attributes,
      providerResult: sanitizedResult(externalId, response, providerStatus),
    },
    providerStatus,
  };
}

async function updateDuplicateListing(
  fetchImpl: typeof fetch,
  options: HttpMarketplaceGatewayOptions,
  input: MarketplacePublishInput,
  externalId: string,
  payload: ReturnType<typeof createProviderListingPayload>,
): Promise<MarketplacePublishResult> {
  const response = await fetchImpl(
    `${baseUrl(options)}${listingPath(options)}/${externalId}`,
    {
      body: JSON.stringify(payload.body),
      headers: {
        Authorization: `Bearer ${input.token.accessToken}`,
        "Content-Type": "application/json",
      },
      method: "PUT",
    },
  );
  const responsePayload = (await response.json().catch(() => ({}))) as Record<
    string,
    unknown
  >;
  if (!response.ok)
    throw providerHttpError(options.provider, response, responsePayload);
  const providerStatus = readString(responsePayload.status) ?? "accepted";
  return {
    externalId,
    metadata: {
      providerRequest: payload.attributes,
      providerResult: sanitizedResult(externalId, response, providerStatus),
    },
    providerStatus,
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
