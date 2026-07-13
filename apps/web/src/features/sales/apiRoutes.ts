import type { SalesAuth, SalesListQuery } from "./types";

export function salesEndpoint(baseUrl: string | undefined, path = "") {
  const base = (baseUrl ?? "/api/v1").replace(/\/$/, "");
  return `${base}/sales${path}`;
}

export const salesRoutes = {
  cancel: (saleId: string, baseUrl?: string) =>
    salesEndpoint(baseUrl, `/${saleId}/cancel`),
  close: (saleId: string, baseUrl?: string) =>
    salesEndpoint(baseUrl, `/${saleId}/close`),
  delete: (saleId: string, baseUrl?: string) =>
    salesEndpoint(baseUrl, `/${saleId}`),
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
  revert: (saleId: string, baseUrl?: string) =>
    salesEndpoint(baseUrl, `/${saleId}/revert`),
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
