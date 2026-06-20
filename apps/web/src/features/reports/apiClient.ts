import type { ReportsAuth, ReportsDashboard } from "./types";

export type ReportsApi = {
  getDashboard: () => Promise<ReportsDashboard>;
};

export type CreateReportsApiOptions = {
  auth?: ReportsAuth;
  baseUrl?: string;
  fetch: typeof fetch;
};

export function createReportsApi({
  auth = {},
  baseUrl,
  fetch,
}: CreateReportsApiOptions): ReportsApi {
  return {
    getDashboard: () =>
      fetch(createEndpoint("/analytics/dashboard", baseUrl), {
        headers: createHeaders(auth),
      }).then(readJson<ReportsDashboard>),
  };
}

function createHeaders(auth: ReportsAuth): HeadersInit {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (auth.accessToken) headers.Authorization = `Bearer ${auth.accessToken}`;
  if (auth.clerkUserId) headers["x-clerk-user-id"] = auth.clerkUserId;
  if (auth.storeSlug) headers["x-store-slug"] = auth.storeSlug;
  return headers;
}

function createEndpoint(path: string, baseUrl = "/api/v1") {
  return `${baseUrl.replace(/\/$/, "")}${path}`;
}

async function readJson<T>(response: Response): Promise<T> {
  if (!response.ok) {
    throw new Error(`Reports request failed with status ${response.status}`);
  }
  return (await response.json()) as T;
}
