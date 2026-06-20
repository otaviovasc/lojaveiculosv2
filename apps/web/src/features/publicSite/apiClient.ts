import type {
  PublicStorefrontData,
  PublicStorefrontLeadInput,
  PublicStorefrontLeadResult,
  PublicStorefrontListingDetailData,
  PublicStorefrontSettingsData,
} from "./types";

export type PublicStorefrontApi = {
  listListings: (
    query?: PublicStorefrontQuery,
  ) => Promise<PublicStorefrontData>;
  getListing: (
    listingSlug: string,
  ) => Promise<PublicStorefrontListingDetailData>;
  getSettings: () => Promise<PublicStorefrontSettingsData>;
  submitListingInterest: (
    listingSlug: string,
    input: PublicStorefrontLeadInput,
  ) => Promise<PublicStorefrontLeadResult>;
};

export type PublicStorefrontQuery = {
  limit?: number;
};

export type CreatePublicStorefrontApiOptions = {
  baseUrl?: string;
  fetch: typeof fetch;
};

export function createPublicStorefrontApi({
  baseUrl,
  fetch,
}: CreatePublicStorefrontApiOptions): PublicStorefrontApi {
  return {
    getListing: (listingSlug) =>
      fetch(publicStorefrontRoutes.listing(listingSlug, baseUrl), {
        method: "GET",
      }).then(readJson<PublicStorefrontListingDetailData>),
    getSettings: () =>
      fetch(publicStorefrontRoutes.settings(baseUrl), {
        method: "GET",
      }).then(readJson<PublicStorefrontSettingsData>),
    listListings: (query) =>
      fetch(
        withQuery(publicStorefrontRoutes.listings(baseUrl), [
          createPublicStorefrontQuery(query),
        ]),
        { method: "GET" },
      ).then(readJson<PublicStorefrontData>),
    submitListingInterest: (listingSlug, input) =>
      fetch(publicStorefrontRoutes.listingLead(listingSlug, baseUrl), {
        body: JSON.stringify(input),
        headers: { "Content-Type": "application/json" },
        method: "POST",
      }).then(readJson<PublicStorefrontLeadResult>),
  };
}

export const publicStorefrontRoutes = {
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

  return params;
}

function createPublicStorefrontEndpoint(path: string, baseUrl = "/api/v1") {
  const normalizedBase = baseUrl.replace(/\/$/, "");
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;

  return `${normalizedBase}${normalizedPath}`;
}

async function readJson<T>(response: Response): Promise<T> {
  if (!response.ok) {
    throw new Error(
      `Public storefront request failed with status ${response.status}`,
    );
  }

  return (await response.json()) as T;
}

function withQuery(route: string, params: URLSearchParams[]) {
  const query = params
    .map((param) => param.toString())
    .filter(Boolean)
    .join("&");

  return query ? `${route}?${query}` : route;
}
