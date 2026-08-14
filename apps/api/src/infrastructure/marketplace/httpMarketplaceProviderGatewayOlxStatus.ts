import type {
  MarketplaceListingReconciliationInput,
  MarketplaceListingReconciliationResult,
} from "../../domains/marketplace/ports/marketplaceProviderGateway.js";
import { assertOlxContract } from "./httpMarketplaceProviderGatewayAuth.js";
import type { HttpMarketplaceGatewayOptions } from "./httpMarketplaceProviderGatewayTypes.js";
import {
  fetchOlx,
  readBoundedOlxRecord,
} from "./httpMarketplaceProviderGatewayOlxRequest.js";
import {
  findOlxImportAd,
  normalizeOlxCurrent,
  normalizeOlxImport,
  normalizeOlxPublished,
  olxResult,
  readOlxAds,
} from "./httpMarketplaceProviderGatewayOlxStatusNormalization.js";
import {
  baseUrl,
  providerHttpError,
  readString,
} from "./httpMarketplaceProviderGatewaySupport.js";

const MAX_PUBLISHED_PAGES = 20;
const PUBLISHED_PAGE_SIZE = 200;

export async function reconcileOlxListingSync(
  fetchImpl: typeof fetch,
  options: HttpMarketplaceGatewayOptions,
  input: MarketplaceListingReconciliationInput,
): Promise<MarketplaceListingReconciliationResult> {
  assertOlxContract(options);
  if (input.operationToken) {
    const imported = await readImportStatus(fetchImpl, options, input);
    if (imported) {
      const currentListId = imported.listId ?? input.listId;
      if (imported.state !== "accepted" || !currentListId) return imported;
      try {
        return await readCurrentStatus(
          fetchImpl,
          options,
          input,
          currentListId,
          true,
        );
      } catch (error) {
        if (isNotFound(error)) return { ...imported, state: "pending" };
        throw error;
      }
    }
  }
  if (input.listId) {
    return readCurrentStatus(fetchImpl, options, input, input.listId);
  }
  return findPublishedStatus(fetchImpl, options, input);
}

async function readImportStatus(
  fetchImpl: typeof fetch,
  options: HttpMarketplaceGatewayOptions,
  input: MarketplaceListingReconciliationInput,
) {
  const response = await fetchOlx(
    fetchImpl,
    `${baseUrl(options)}${options.listingPath ?? "/autoupload/import"}/${encodeURIComponent(input.operationToken ?? "")}`,
    {
      body: JSON.stringify({ access_token: input.token.accessToken }),
      headers: {
        "Content-Type": "application/json",
        "User-Agent": "Mozilla/5.0",
      },
      method: "POST",
    },
  );
  const payload = await readBoundedOlxRecord(response);
  if (!response.ok) {
    if (
      response.status === 404 ||
      response.status === 410 ||
      isExpired(payload)
    ) {
      return null;
    }
    throw providerHttpError("olx", response, payload);
  }
  const ad = findOlxImportAd(payload.ads, input.externalId);
  if (!ad) {
    return olxResult(input, {
      providerStatus: readString(payload.autoupload_status) ?? "unknown",
      state: "unknown",
    });
  }
  return normalizeOlxImport(input, ad, input.listId);
}

async function readCurrentStatus(
  fetchImpl: typeof fetch,
  options: HttpMarketplaceGatewayOptions,
  input: MarketplaceListingReconciliationInput,
  listId: string,
  operationConfirmed = false,
) {
  const response = await fetchOlx(
    fetchImpl,
    `${baseUrl(options)}/autoupload/ads/${encodeURIComponent(listId)}`,
    {
      headers: { Authorization: `Bearer ${input.token.accessToken}` },
      method: "GET",
    },
  );
  const payload = await readBoundedOlxRecord(response);
  if (!response.ok) throw providerHttpError("olx", response, payload);
  return normalizeOlxCurrent(input, payload, listId, operationConfirmed);
}

async function findPublishedStatus(
  fetchImpl: typeof fetch,
  options: HttpMarketplaceGatewayOptions,
  input: MarketplaceListingReconciliationInput,
) {
  let pageToken: string | null = null;
  const visited = new Set<string>();
  for (let page = 0; page < MAX_PUBLISHED_PAGES; page += 1) {
    const url = new URL(`${baseUrl(options)}/autoupload/v1/published`);
    url.searchParams.set("fetch_size", String(PUBLISHED_PAGE_SIZE));
    if (pageToken) url.searchParams.set("page_token", pageToken);
    const response = await fetchOlx(fetchImpl, url.toString(), {
      headers: { Authorization: `Bearer ${input.token.accessToken}` },
      method: "GET",
    });
    const payload = await readBoundedOlxRecord(response);
    if (!response.ok) throw providerHttpError("olx", response, payload);
    const match = readOlxAds(payload.data).find(
      (ad) => readString(ad.id) === input.externalId,
    );
    if (match) return normalizeOlxPublished(input, match);
    const next = readString(payload.next_token);
    if (!next || next.length > 1_024 || visited.has(next)) break;
    visited.add(next);
    pageToken = next;
  }
  return olxResult(input, { providerStatus: "not_found", state: "unknown" });
}

function isExpired(payload: Record<string, unknown>) {
  const text = `${readString(payload.reason) ?? ""} ${readString(payload.message) ?? ""}`;
  return /expired|invalid.*token|token.*not found/i.test(text);
}

function isNotFound(error: unknown) {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === "MARKETPLACE_LISTING_NOT_FOUND"
  );
}
