import { readApiJson } from "../../lib/apiErrors";
import type {
  PublicStorefrontData,
  PublicStorefrontCustomPageData,
  PublicStorefrontLeadInput,
  PublicStorefrontLeadResult,
  PublicStorefrontListingDetailData,
  PublicStorefrontSettingsData,
  PublicVehicleListing,
} from "./types";

export type PublicStorefrontApi = {
  listListings: (
    query?: PublicStorefrontQuery,
  ) => Promise<PublicStorefrontData>;
  getListing: (
    listingSlug: string,
  ) => Promise<PublicStorefrontListingDetailData>;
  getSettings: () => Promise<PublicStorefrontSettingsData>;
  getCustomPage: (
    pageSlug: string,
    token?: string | null,
  ) => Promise<PublicStorefrontCustomPageData>;
  submitListingInterest: (
    listingSlug: string,
    input: PublicStorefrontLeadInput,
  ) => Promise<PublicStorefrontLeadResult>;
  submitStorefrontInterest: (
    input: PublicStorefrontLeadInput,
  ) => Promise<PublicStorefrontLeadResult>;
};

export type PublicStorefrontQuery = {
  limit?: number;
  offset?: number;
};

export type CreatePublicStorefrontApiOptions = {
  baseUrl?: string;
  fetch: typeof fetch;
  storeSlug?: string | null;
};

export function createPublicStorefrontApi({
  baseUrl,
  fetch,
  storeSlug,
}: CreatePublicStorefrontApiOptions): PublicStorefrontApi {
  const headers = createPublicStorefrontHeaders(storeSlug);
  return {
    getCustomPage: (pageSlug, token) =>
      fetch(
        withQuery(publicStorefrontRoutes.customPage(pageSlug, baseUrl), [
          createPreviewTokenQuery(token),
        ]),
        {
          headers,
          method: "GET",
        },
      ).then(readJson<PublicStorefrontCustomPageData>),
    getListing: (listingSlug) =>
      fetch(publicStorefrontRoutes.listing(listingSlug, baseUrl), {
        headers,
        method: "GET",
      }).then(readJson<PublicStorefrontListingDetailData>),
    getSettings: () =>
      fetch(publicStorefrontRoutes.settings(baseUrl), {
        headers,
        method: "GET",
      }).then(readJson<PublicStorefrontSettingsData>),
    listListings: (query) =>
      fetch(
        withQuery(publicStorefrontRoutes.listings(baseUrl), [
          createPublicStorefrontQuery(query),
        ]),
        { headers, method: "GET" },
      ).then(readJson<PublicStorefrontData>),
    submitListingInterest: (listingSlug, input) =>
      fetch(publicStorefrontRoutes.listingLead(listingSlug, baseUrl), {
        body: JSON.stringify(input),
        headers: { ...headers, "Content-Type": "application/json" },
        method: "POST",
      }).then(readJson<PublicStorefrontLeadResult>),
    submitStorefrontInterest: (input) =>
      fetch(publicStorefrontRoutes.lead(baseUrl), {
        body: JSON.stringify(input),
        headers: { ...headers, "Content-Type": "application/json" },
        method: "POST",
      }).then(readJson<PublicStorefrontLeadResult>),
  };
}

export const publicStorefrontRoutes = {
  customPage: (pageSlug: string, baseUrl?: string) =>
    createPublicStorefrontEndpoint(
      `/public/storefront/pages/${encodeURIComponent(pageSlug)}`,
      baseUrl,
    ),
  listing: (listingSlug: string, baseUrl?: string) =>
    createPublicStorefrontEndpoint(
      `/public/storefront/listings/${encodeURIComponent(listingSlug)}`,
      baseUrl,
    ),
  listingLead: (listingSlug: string, baseUrl?: string) =>
    createPublicStorefrontEndpoint(
      `/public/storefront/listings/${encodeURIComponent(listingSlug)}/leads`,
      baseUrl,
    ),
  lead: (baseUrl?: string) =>
    createPublicStorefrontEndpoint("/public/storefront/leads", baseUrl),
  listings: (baseUrl?: string) =>
    createPublicStorefrontEndpoint("/public/storefront/listings", baseUrl),
  settings: (baseUrl?: string) =>
    createPublicStorefrontEndpoint("/public/storefront/settings", baseUrl),
} as const;

export function createPublicStorefrontQuery(query: PublicStorefrontQuery = {}) {
  const params = new URLSearchParams();

  if (query.limit !== undefined) {
    params.set("limit", String(query.limit));
  }
  if (query.offset !== undefined) {
    params.set("offset", String(query.offset));
  }

  return params;
}

export async function listAllPublicStorefrontListings(
  api: PublicStorefrontApi,
): Promise<PublicStorefrontData> {
  const listings: PublicVehicleListing[] = [];
  const seenSlugs = new Set<string>();
  let offset = 0;

  while (true) {
    const page = await api.listListings({
      limit: PUBLIC_STOREFRONT_PAGE_SIZE,
      offset,
    });
    const previousListingCount = listings.length;
    for (const listing of page.listings) {
      if (seenSlugs.has(listing.slug)) continue;
      seenSlugs.add(listing.slug);
      listings.push(listing);
    }

    if (page.listings.length > 0 && listings.length === previousListingCount) {
      throw new Error("Public storefront pagination made no progress.");
    }

    if (page.listings.length < PUBLIC_STOREFRONT_PAGE_SIZE) {
      return { ...page, listings };
    }

    offset += page.listings.length;
  }
}

function createPreviewTokenQuery(token?: string | null) {
  const params = new URLSearchParams();
  if (token) params.set("token", token);
  return params;
}

function createPublicStorefrontEndpoint(path: string, baseUrl = "/api/v1") {
  const normalizedBase = baseUrl.replace(/\/$/, "");
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;

  return `${normalizedBase}${normalizedPath}`;
}

function createPublicStorefrontHeaders(
  storeSlug?: string | null,
): Record<string, string> {
  return storeSlug ? { "x-store-slug": storeSlug } : {};
}

async function readJson<T>(response: Response): Promise<T> {
  return readApiJson<T>(response, { feature: "Vitrine pública" });
}

function withQuery(route: string, params: URLSearchParams[]) {
  const query = params
    .map((param) => param.toString())
    .filter(Boolean)
    .join("&");

  return query ? `${route}?${query}` : route;
}

const PUBLIC_STOREFRONT_PAGE_SIZE = 48;
