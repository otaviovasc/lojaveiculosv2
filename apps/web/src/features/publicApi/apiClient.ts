import { readApiJson } from "../../lib/apiErrors";
import type {
  CreatePublicApiClientInput,
  CreatedPublicApiClient,
  PublicApiAuth,
  PublicApiClient,
} from "./types";

export type PublicApi = {
  createClient: (
    input: CreatePublicApiClientInput,
  ) => Promise<CreatedPublicApiClient>;
  listClients: () => Promise<{ clients: PublicApiClient[] }>;
  revokeClient: (clientId: string) => Promise<PublicApiClient>;
};

export type CreatePublicApiOptions = {
  auth?: PublicApiAuth;
  baseUrl?: string;
  fetch: typeof fetch;
};

export function createPublicApi({
  auth = {},
  baseUrl,
  fetch,
}: CreatePublicApiOptions): PublicApi {
  return {
    createClient: (input) =>
      fetch(publicApiRoutes.clients(baseUrl), {
        body: JSON.stringify(input),
        headers: createHeaders(auth),
        method: "POST",
      }).then(readJson<CreatedPublicApiClient>),
    listClients: () =>
      fetch(publicApiRoutes.clients(baseUrl), {
        headers: createHeaders(auth),
      }).then(readJson<{ clients: PublicApiClient[] }>),
    revokeClient: (clientId) =>
      fetch(publicApiRoutes.revoke(clientId, baseUrl), {
        headers: createHeaders(auth),
        method: "POST",
      }).then(readJson<PublicApiClient>),
  };
}

export const publicApiRoutes = {
  clients: (baseUrl?: string) =>
    createEndpoint("/external-api/clients", baseUrl),
  revoke: (clientId: string, baseUrl?: string) =>
    createEndpoint(
      `/external-api/clients/${encodeURIComponent(clientId)}/revoke`,
      baseUrl,
    ),
} as const;

function createHeaders(auth: PublicApiAuth): HeadersInit {
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
  return readApiJson<T>(response, { feature: "API publica" });
}
