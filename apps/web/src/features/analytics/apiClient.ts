import { readApiJson } from "../../lib/apiErrors";
import type {
  AnalyticsAuth,
  AnalyticsDashboard,
  AnalyticsPeriod,
  HomeDashboard,
} from "./types";

export type AnalyticsApi = {
  getDashboard: (period: AnalyticsPeriod) => Promise<AnalyticsDashboard>;
  getHomeDashboard: () => Promise<HomeDashboard>;
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
    getDashboard: (period) =>
      fetch(analyticsRoutes.dashboard(period, baseUrl), {
        headers: createHeaders(auth),
      }).then(readJson<AnalyticsDashboard>),
    getHomeDashboard: () =>
      fetch(analyticsRoutes.home(baseUrl), {
        headers: createHeaders(auth),
      }).then(readJson<HomeDashboard>),
  };
}

export const analyticsRoutes = {
  dashboard: (period: AnalyticsPeriod, baseUrl?: string) =>
    createEndpoint(
      `/analytics/dashboard?from=${period.from}&to=${period.to}`,
      baseUrl,
    ),
  home: (baseUrl?: string) => createEndpoint("/analytics/home", baseUrl),
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
  return readApiJson<T>(response, { feature: "Analytics" });
}
