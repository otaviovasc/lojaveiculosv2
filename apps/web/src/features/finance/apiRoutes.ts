import type {
  FinanceAuth,
  FinanceEntryStatus,
  FinanceEntryType,
} from "./types";

export type ListFinanceEntriesInput = {
  limit?: number;
  offset?: number;
  status?: FinanceEntryStatus;
  type?: FinanceEntryType;
};

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
  entries: (
    baseUrl?: string,
    input: ListFinanceEntriesInput | FinanceEntryType = {},
  ) => {
    const endpoint = createFinanceEndpoint("/finance/entries", baseUrl);
    const query = typeof input === "string" ? { type: input } : input;
    const params = new URLSearchParams();
    if (query.limit !== undefined) params.set("limit", String(query.limit));
    if (query.offset !== undefined) params.set("offset", String(query.offset));
    if (query.status) params.set("status", query.status);
    if (query.type) params.set("type", query.type);
    return params.size > 0 ? `${endpoint}?${params.toString()}` : endpoint;
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
