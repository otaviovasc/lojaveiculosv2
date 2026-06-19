import type { InternalHealthAuth, InternalHealthSnapshot } from "./types";

export type InternalHealthApi = {
  getHealth: (limit?: number) => Promise<InternalHealthSnapshot>;
};

export type CreateInternalHealthApiOptions = {
  auth?: InternalHealthAuth;
  baseUrl?: string;
  fetch: typeof fetch;
};

export function createInternalHealthApi({
  auth = {},
  baseUrl,
  fetch,
}: CreateInternalHealthApiOptions): InternalHealthApi {
  return {
    getHealth: (limit = 40) =>
      fetch(internalHealthRoutes.health(limit, baseUrl), {
        headers: createHeaders(auth),
      }).then(readJson<InternalHealthSnapshot>),
  };
}

export const internalHealthRoutes = {
  health: (limit: number, baseUrl?: string) =>
    createEndpoint(`/internal/health?limit=${limit}`, baseUrl),
} as const;

function createHeaders(auth: InternalHealthAuth): HeadersInit {
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
    throw new Error(
      `Internal health request failed with status ${response.status}`,
    );
  }
  return (await response.json()) as T;
}
