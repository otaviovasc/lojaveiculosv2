import type { FinanceAuth, FinanceEntryType } from "./types";

export const financeRoutes = {
  cancelEntry: (entryId: string, baseUrl?: string) =>
    createFinanceEndpoint(
      `/finance/entries/${encodeURIComponent(entryId)}/cancel`,
      baseUrl,
    ),
  commissionRules: (baseUrl?: string) =>
    createFinanceEndpoint("/finance/commission-rules", baseUrl),
  documentUploads: (entryId: string, baseUrl?: string) =>
    createFinanceEndpoint(
      `/finance/entries/${encodeURIComponent(entryId)}/documents/uploads`,
      baseUrl,
    ),
  documents: (entryId: string, baseUrl?: string) =>
    createFinanceEndpoint(
      `/finance/entries/${encodeURIComponent(entryId)}/documents`,
      baseUrl,
    ),
  entry: (entryId: string, baseUrl?: string) =>
    createFinanceEndpoint(
      `/finance/entries/${encodeURIComponent(entryId)}`,
      baseUrl,
    ),
  entries: (baseUrl?: string, type?: FinanceEntryType) => {
    const endpoint = createFinanceEndpoint("/finance/entries", baseUrl);
    return type ? `${endpoint}?type=${encodeURIComponent(type)}` : endpoint;
  },
  payEntry: (entryId: string, baseUrl?: string) =>
    createFinanceEndpoint(
      `/finance/entries/${encodeURIComponent(entryId)}/pay`,
      baseUrl,
    ),
  recurringEntries: (baseUrl?: string) =>
    createFinanceEndpoint("/finance/recurring-entries", baseUrl),
  summary: (baseUrl?: string) =>
    createFinanceEndpoint("/finance/summary", baseUrl),
} as const;

export function createFinanceHeaders(auth: FinanceAuth): HeadersInit {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  if (auth.accessToken) headers.Authorization = `Bearer ${auth.accessToken}`;
  if (auth.clerkUserId) headers["x-clerk-user-id"] = auth.clerkUserId;
  if (auth.storeSlug) headers["x-store-slug"] = auth.storeSlug;

  return headers;
}

export function createFinanceEndpoint(path: string, baseUrl = "/api/v1") {
  const normalizedBase = baseUrl.replace(/\/$/, "");
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;

  return `${normalizedBase}${normalizedPath}`;
}
