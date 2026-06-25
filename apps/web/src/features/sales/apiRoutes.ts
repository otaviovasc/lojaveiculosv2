import type { SalesAuth, SalesListQuery } from "./types";

export function salesEndpoint(baseUrl: string | undefined, path = "") {
  const base = baseUrl ? baseUrl.replace(/\/$/, "") : "";
  return `${base}/api/v1/sales${path}`;
}

export const salesRoutes = {
  cancel: (saleId: string, baseUrl?: string) =>
    salesEndpoint(baseUrl, `/${saleId}/cancel`),
  close: (saleId: string, baseUrl?: string) =>
    salesEndpoint(baseUrl, `/${saleId}/close`),
  draft: (saleId: string, baseUrl?: string) =>
    salesEndpoint(baseUrl, `/${saleId}`),
  drafts: (baseUrl?: string) => salesEndpoint(baseUrl, "/drafts"),
  list: (baseUrl?: string, query: SalesListQuery = {}) => {
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(query)) {
      if (value !== undefined && value !== "") params.set(key, String(value));
    }
    const suffix = params.toString() ? `?${params}` : "";
    return salesEndpoint(baseUrl, suffix);
  },
  reserve: (saleId: string, baseUrl?: string) =>
    salesEndpoint(baseUrl, `/${saleId}/reserve`),
};

export function createSalesHeaders(auth: SalesAuth = {}): HeadersInit {
  return {
    "content-type": "application/json",
    ...(auth.accessToken
      ? { Authorization: `Bearer ${auth.accessToken}` }
      : {}),
    ...(auth.clerkUserId ? { "x-dev-clerk-user-id": auth.clerkUserId } : {}),
    ...(auth.storeSlug ? { "x-store-slug": auth.storeSlug } : {}),
  };
}
