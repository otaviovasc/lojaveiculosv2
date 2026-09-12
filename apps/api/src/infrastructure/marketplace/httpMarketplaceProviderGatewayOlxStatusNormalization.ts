import type {
  MarketplaceListingReconciliationInput,
  MarketplaceListingReconciliationResult,
  MarketplaceListingReconciliationState,
} from "../../domains/marketplace/ports/marketplaceProviderGateway.js";
import { readString } from "./httpMarketplaceProviderGatewaySupport.js";

export function findOlxImportAd(ads: unknown, externalId: string) {
  if (isRecord(ads)) {
    const keyed = ads[externalId];
    if (isRecord(keyed)) return keyed;
    return Object.values(ads).find(
      (ad): ad is Record<string, unknown> =>
        isRecord(ad) && readString(ad.id) === externalId,
    );
  }
  return readOlxAds(ads).find((ad) => readString(ad.id) === externalId);
}

export function normalizeOlxImport(
  input: MarketplaceListingReconciliationInput,
  ad: Record<string, unknown>,
  fallbackListId: string | null,
) {
  const providerStatus = status(ad);
  let state = importState(providerStatus);
  const operation = readString(ad.operation)?.toLowerCase() ?? null;
  if (isTerminal(state) && operation !== expectedOperation(input.jobType)) {
    state = "unknown";
  } else if (state === "accepted" && operation === "delete") {
    state = "deleted";
  }
  return olxResult(input, {
    listId: readString(ad.list_id) ?? fallbackListId,
    listingUrl: safeOlxUrl(ad.url),
    message: sanitizedMessage(ad.message),
    providerStatus,
    state,
  });
}

export function normalizeOlxCurrent(
  input: MarketplaceListingReconciliationInput,
  ad: Record<string, unknown>,
  expectedListId: string,
  operationConfirmed: boolean,
) {
  const externalId = readString(ad.id);
  const listId = readString(ad.list_id);
  if (externalId !== input.externalId || listId !== expectedListId) {
    return olxResult(input, {
      listId: expectedListId,
      providerStatus: status(ad),
      state: "unknown",
    });
  }
  const providerStatus = status(ad);
  const states: Record<string, MarketplaceListingReconciliationState> = {
    accepted: "accepted",
    deleted: "deleted",
    pending: "pending",
    refused: "refused",
  };
  const state = states[providerStatus] ?? "unknown";
  return olxResult(input, {
    listId: listId ?? expectedListId,
    listingUrl: safeOlxUrl(ad.url),
    message: sanitizedMessage(ad.message),
    providerStatus,
    state:
      input.jobType === "listing_update" &&
      state === "accepted" &&
      !operationConfirmed
        ? "unknown"
        : state,
  });
}

export function normalizeOlxPublished(
  input: MarketplaceListingReconciliationInput,
  ad: Record<string, unknown>,
) {
  const providerStatus = status(ad);
  const states: Record<string, MarketplaceListingReconciliationState> = {
    deleted: "deleted",
    pending_review: "pending",
    published: "accepted",
    refused: "refused",
  };
  const state = states[providerStatus] ?? "unknown";
  return olxResult(input, {
    listId: readString(ad.list_id),
    providerStatus,
    state:
      input.jobType === "listing_update" && state === "accepted"
        ? "unknown"
        : state,
  });
}

export function olxResult(
  input: MarketplaceListingReconciliationInput,
  patch: Partial<MarketplaceListingReconciliationResult> &
    Pick<MarketplaceListingReconciliationResult, "providerStatus" | "state">,
): MarketplaceListingReconciliationResult {
  return {
    externalId: input.externalId,
    listId: null,
    listingUrl: null,
    message: null,
    ...patch,
  };
}

export function readOlxAds(value: unknown): Record<string, unknown>[] {
  return Array.isArray(value) ? value.filter(isRecord) : [];
}

function expectedOperation(
  jobType: MarketplaceListingReconciliationInput["jobType"],
) {
  if (jobType === "listing_unpublish") return "delete";
  if (jobType === "listing_update") return "edit";
  return "insert";
}

function isTerminal(state: MarketplaceListingReconciliationState) {
  return (
    state === "accepted" ||
    state === "deleted" ||
    state === "error" ||
    state === "refused"
  );
}

function importState(
  statusValue: string,
): MarketplaceListingReconciliationState {
  if (statusValue === "accept") return "accepted";
  if (
    statusValue === "accepted" ||
    statusValue === "error" ||
    statusValue === "pending" ||
    statusValue === "queued" ||
    statusValue === "refused" ||
    statusValue === "deleted"
  ) {
    return statusValue;
  }
  return "unknown";
}

function status(ad: Record<string, unknown>) {
  return (readString(ad.status) ?? "unknown").toLowerCase();
}

function sanitizedMessage(value: unknown): string | null {
  const messages: string[] = [];
  collectStrings(value, messages, 0);
  const sanitized = messages
    .join("; ")
    .replace(/https?:\/\/\S+/gi, "[url]")
    .replace(/\b[A-Z]{3}\d[A-Z0-9]\d{2}\b/gi, "[redacted]")
    .replace(/\b[\w.+-]+@[\w.-]+\.[A-Z]{2,}\b/gi, "[redacted]")
    .replace(/\b\d{8,}\b/g, "[redacted]")
    .replace(/\b(?:bearer\s+)?[a-z0-9_-]{32,}\b/gi, "[redacted]")
    .replace(/[\u0000-\u001f\u007f]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 320);
  return sanitized || null;
}

function collectStrings(value: unknown, target: string[], depth: number) {
  if (target.length >= 8 || depth > 3) return;
  if (typeof value === "string") target.push(value);
  else if (Array.isArray(value)) {
    value
      .slice(0, 8)
      .forEach((item) => collectStrings(item, target, depth + 1));
  } else if (isRecord(value)) {
    Object.values(value)
      .slice(0, 8)
      .forEach((item) => collectStrings(item, target, depth + 1));
  }
}

function safeOlxUrl(value: unknown) {
  const text = readString(value);
  if (!text || text.length > 2_048) return null;
  try {
    const url = new URL(text);
    if (
      url.protocol !== "https:" ||
      !/(^|\.)olx\.com\.br$/i.test(url.hostname)
    ) {
      return null;
    }
    url.username = "";
    url.password = "";
    return url.toString();
  } catch {
    return null;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}
