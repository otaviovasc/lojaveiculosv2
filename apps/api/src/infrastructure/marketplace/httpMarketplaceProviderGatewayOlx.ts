import type {
  MarketplacePublishInput,
  MarketplacePublishResult,
} from "../../domains/marketplace/ports/marketplaceProviderGateway.js";
import { createProviderListingPayload } from "../../domains/marketplace/payloads/marketplaceListingPayload.js";
import { assertOlxContract } from "./httpMarketplaceProviderGatewayAuth.js";
import type { HttpMarketplaceGatewayOptions } from "./httpMarketplaceProviderGatewayTypes.js";
import {
  baseUrl,
  MarketplaceProviderGatewayError,
  MarketplaceProviderPayloadError,
  providerHttpError,
  readString,
} from "./httpMarketplaceProviderGatewaySupport.js";

export async function runOlxAutouploadSync(
  fetchImpl: typeof fetch,
  options: HttpMarketplaceGatewayOptions,
  input: MarketplacePublishInput,
): Promise<MarketplacePublishResult> {
  assertOlxContract(options);
  const payload =
    input.jobType === "listing_unpublish"
      ? {
          attributes: { categoryId: "autoupload" },
          body: { id: input.externalId, operation: "delete" },
          mediaUrls: [],
          title: input.externalId ?? "OLX listing",
        }
      : createProviderListingPayload({
          listing: requireListing(input),
          provider: options.provider,
          settings: input.metadata,
        });

  const response = await fetchImpl(
    `${baseUrl(options)}${listingPath(options)}`,
    {
      body: JSON.stringify({
        access_token: input.token.accessToken,
        ad_list: [payload.body],
      }),
      headers: {
        "Content-Type": "application/json",
        "User-Agent": "Mozilla/5.0",
      },
      method: "PUT",
    },
  );
  const responsePayload = (await response.json().catch(() => ({}))) as Record<
    string,
    unknown
  >;
  if (!response.ok) {
    throw providerHttpError(options.provider, response, responsePayload);
  }
  assertOlxImportAccepted(
    responsePayload,
    input.externalId ?? payload.body.id,
    input.jobType,
  );
  const externalId = readString(payload.body.id) ?? input.externalId ?? null;
  const providerStatus =
    readString(responsePayload.statusMessage) ??
    readString(responsePayload.status) ??
    "accepted";
  return {
    externalId,
    metadata: {
      providerRequest: payload.attributes,
      providerResult: {
        externalId,
        providerRequestId: response.headers.get("x-request-id"),
        providerStatus,
      },
    },
    providerStatus,
  };
}

function requireListing(input: MarketplacePublishInput) {
  if (!input.listing) throw new MarketplaceProviderPayloadError(input.jobType);
  return input.listing;
}

function assertOlxImportAccepted(
  responsePayload: Record<string, unknown>,
  externalId: unknown,
  jobType: MarketplacePublishInput["jobType"],
) {
  const statusCode = readNumber(responsePayload.statusCode);
  const error = findOlxAdError(responsePayload.errors, externalId);
  if (error && isMissingOlxListing(error) && jobType === "listing_unpublish") {
    throw new MarketplaceProviderGatewayError(
      "MARKETPLACE_LISTING_NOT_FOUND",
      "Marketplace external listing was not found.",
      "olx",
      404,
      olxDetails(statusCode, externalId),
    );
  }
  if (error) {
    throw new MarketplaceProviderGatewayError(
      "MARKETPLACE_PROVIDER_VALIDATION_FAILED",
      "Marketplace provider rejected the listing payload.",
      "olx",
      400,
      olxDetails(statusCode, externalId),
    );
  }
  if (statusCode === null || statusCode >= 0) return;
  if (statusCode === -6 || statusCode === -7 || statusCode === -8) {
    throw new MarketplaceProviderGatewayError(
      "MARKETPLACE_PROVIDER_ACCOUNT_BLOCKED",
      "Marketplace account requirement blocked this operation.",
      "olx",
      403,
      olxDetails(statusCode, externalId),
    );
  }
  if (statusCode === -4) {
    throw new MarketplaceProviderGatewayError(
      "MARKETPLACE_PROVIDER_VALIDATION_FAILED",
      "Marketplace provider rejected the listing payload.",
      "olx",
      400,
      olxDetails(statusCode, externalId),
    );
  }
  throw new MarketplaceProviderGatewayError(
    "MARKETPLACE_PROVIDER_UNAVAILABLE",
    "Marketplace provider is unavailable.",
    "olx",
    503,
    olxDetails(statusCode, externalId),
  );
}

function olxDetails(statusCode: number | null, externalId: unknown) {
  return {
    ...(readString(externalId) ? { externalId: readString(externalId) } : {}),
    provider: "olx" as const,
    ...(statusCode === null ? {} : { providerStatus: String(statusCode) }),
  };
}

function findOlxAdError(
  errors: unknown,
  externalId: unknown,
): Record<string, unknown> | null {
  if (!Array.isArray(errors)) return null;
  const expected = readString(externalId);
  for (const item of errors as unknown[]) {
    if (!isRecord(item)) continue;
    const id = readString(item.id);
    if (expected ? id === expected : Boolean(id)) return item;
  }
  return null;
}

function isMissingOlxListing(error: unknown) {
  const messages = readOlxMessages(error).toLowerCase();
  return (
    messages.includes("not found") ||
    messages.includes("nao encontrado") ||
    messages.includes("não encontrado") ||
    messages.includes("inexistent")
  );
}

function readOlxMessages(error: unknown) {
  if (!isRecord(error)) return "";
  const messages = error.messages;
  if (!Array.isArray(messages)) return "";
  return messages
    .flatMap((item) =>
      item && typeof item === "object" ? Object.values(item) : [],
    )
    .filter((item): item is string => typeof item === "string")
    .join(" ");
}

function readNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function listingPath(options: HttpMarketplaceGatewayOptions) {
  return options.listingPath ?? "/autoupload/import";
}
