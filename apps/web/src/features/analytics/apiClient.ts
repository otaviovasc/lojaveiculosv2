import type { AnalyticsAuth, AnalyticsDashboard } from "./types";

export type AnalyticsApi = {
  getDashboard: () => Promise<AnalyticsDashboard>;
};

export type CreateAnalyticsApiOptions = {
  auth?: AnalyticsAuth;
  baseUrl?: string;
  fetch: typeof fetch;
};

export function createAnalyticsApi({
  auth = {},
  baseUrl,
  fetch,
}: CreateAnalyticsApiOptions): AnalyticsApi {
  return {
    getDashboard: () =>
      fetch(analyticsRoutes.dashboard(baseUrl), {
        headers: createHeaders(auth),
      }).then(readJson<AnalyticsDashboard>),
  };
}

export const analyticsRoutes = {
  dashboard: (baseUrl?: string) => createEndpoint("/analytics/dashboard", baseUrl),
} as const;

function createHeaders(auth: AnalyticsAuth): HeadersInit {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (auth.accessToken) headers.Authorization = `Bearer ${auth.accessToken}`;
  if (auth.clerkUserId) headers["x-clerk-user-id"] = auth.clerkUserId;
  if (auth.storeSlug) headers["x-store-slug"] = auth.storeSlug;
  return headers;
}

function createEndpoint(path: string, baseUrl = "/api/v1") {
  const normalizedBase = baseUrl.replace(/\/$/, "");
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${normalizedBase}${normalizedPath}`;
}

async function readJson<T>(response: Response): Promise<T> {
  if (!response.ok) {
    throw new Error(`Analytics request failed with status ${response.status}`);
  }
  return (await response.json()) as T;
}
