import { readApiJson, readApiVoid } from "../../lib/apiErrors";
import type { AgencyAuth } from "./apiClient";

/**
 * Agency-only Credere management client.
 *
 * This is the only surface allowed to list provider sub-stores and display
 * their external ids. Token/account credentials are never parsed or rendered:
 * the connection parser reads only connection state, an optional display
 * label, and store mappings. Wire aliases stay centralized here while the
 * backend DTO names settle.
 */
export type AgencyCredereStoreMapping = {
  storeId: string;
  externalStoreId: string | null;
  externalStoreAlias: string | null;
};

export type AgencyCredereConnection = {
  configured: boolean;
  connected: boolean;
  connectionStatus: string | null;
  connectedAt: string | null;
  mappings: AgencyCredereStoreMapping[];
};

export type AgencyCredereProviderStore = {
  externalStoreId: string;
  name: string | null;
  document: string | null;
  status: string | null;
};

export type AgencyCredereApi = {
  disconnect: (tenantId: string) => Promise<void>;
  getConnection: (tenantId: string) => Promise<AgencyCredereConnection>;
  listProviderStores: (
    tenantId: string,
  ) => Promise<AgencyCredereProviderStore[]>;
  mapStore: (
    tenantId: string,
    storeId: string,
    externalStoreId: string,
  ) => Promise<void>;
  startOAuth: (tenantId: string) => Promise<{ authorizationUrl: string }>;
  unmapStore: (tenantId: string, storeId: string) => Promise<void>;
};

export function createAgencyCredereApi(options: {
  auth?: AgencyAuth;
  baseUrl?: string;
  fetch: typeof fetch;
}): AgencyCredereApi {
  const auth = options.auth ?? {};
  const request = <T>(path: string, init?: RequestInit) =>
    options.fetch.call(globalThis, path, init).then(readJson<T>);
  return {
    disconnect: (tenantId) =>
      options.fetch
        .call(globalThis, routes.disconnect(tenantId, options.baseUrl), {
          headers: headers(auth),
          method: "DELETE",
        })
        .then(readVoid),
    getConnection: (tenantId) =>
      request<unknown>(routes.connection(tenantId, options.baseUrl), {
        headers: headers(auth),
      }).then(parseConnection),
    listProviderStores: (tenantId) =>
      request<unknown>(routes.providerStores(tenantId, options.baseUrl), {
        headers: headers(auth),
      }).then(parseProviderStores),
    mapStore: (tenantId, storeId, externalStoreId) =>
      options.fetch
        .call(
          globalThis,
          routes.storeMapping(tenantId, storeId, options.baseUrl),
          {
            body: JSON.stringify({ externalStoreId }),
            headers: headers(auth),
            method: "PUT",
          },
        )
        .then(readVoid),
    startOAuth: (tenantId) =>
      request<unknown>(routes.oauthStart(tenantId, options.baseUrl), {
        body: JSON.stringify({}),
        headers: headers(auth),
        method: "POST",
      }).then((raw) => {
        const record = asRecord(raw);
        const authorizationUrl = readString(record, [
          "authorizationUrl",
          "authorization_url",
          "url",
        ]);
        if (!authorizationUrl) {
          throw new Error("Resposta OAuth sem authorizationUrl.");
        }
        return { authorizationUrl };
      }),
    unmapStore: (tenantId, storeId) =>
      options.fetch
        .call(
          globalThis,
          routes.storeMapping(tenantId, storeId, options.baseUrl),
          {
            headers: headers(auth),
            method: "DELETE",
          },
        )
        .then(readVoid),
  };
}

const routes = {
  connection: (tenantId: string, baseUrl?: string) =>
    endpoint(
      `/agency/tenants/${encodeURIComponent(tenantId)}/financing/credere`,
      baseUrl,
    ),
  disconnect: (tenantId: string, baseUrl?: string) =>
    endpoint(
      `/agency/tenants/${encodeURIComponent(
        tenantId,
      )}/financing/credere/connection`,
      baseUrl,
    ),
  oauthStart: (tenantId: string, baseUrl?: string) =>
    endpoint(
      `/agency/tenants/${encodeURIComponent(
        tenantId,
      )}/financing/credere/oauth/start`,
      baseUrl,
    ),
  providerStores: (tenantId: string, baseUrl?: string) =>
    endpoint(
      `/agency/tenants/${encodeURIComponent(
        tenantId,
      )}/financing/credere/provider-stores`,
      baseUrl,
    ),
  storeMapping: (tenantId: string, storeId: string, baseUrl?: string) =>
    endpoint(
      `/agency/tenants/${encodeURIComponent(
        tenantId,
      )}/financing/credere/store-mappings/${encodeURIComponent(storeId)}`,
      baseUrl,
    ),
} as const;

export function parseConnection(raw: unknown): AgencyCredereConnection {
  const record = asRecord(raw);
  const nestedConnection = asRecord(record?.["connection"]);
  const mappingsRaw = record?.["mappings"] ?? record?.["storeMappings"];
  return {
    configured: readBoolean(record, ["configured"]) ?? false,
    connected:
      readBoolean(record, ["connected", "isConnected"]) ??
      readBoolean(nestedConnection, ["connected"]) ??
      nestedConnection?.["status"] === "connected",
    connectionStatus: readString(nestedConnection, ["status"]),
    connectedAt: readString(nestedConnection, ["connectedAt", "connected_at"]),
    mappings: Array.isArray(mappingsRaw) ? mappingsRaw.map(parseMapping) : [],
  };
}

export function parseProviderStores(
  raw: unknown,
): AgencyCredereProviderStore[] {
  const list = Array.isArray(raw)
    ? raw
    : (asRecord(raw)?.["stores"] ?? asRecord(raw)?.["items"]);
  if (!Array.isArray(list)) return [];
  return list.map((item) => {
    const record = asRecord(item) ?? {};
    return {
      externalStoreId:
        readString(record, ["externalStoreId", "id", "credereStoreId"]) ??
        "unknown",
      name: readString(record, ["name", "displayName", "alias"]),
      document: readString(record, ["document", "cnpj"]),
      status: readString(record, ["status"]),
    };
  });
}

function parseMapping(raw: unknown): AgencyCredereStoreMapping {
  const record = asRecord(raw) ?? {};
  return {
    storeId: readString(record, ["storeId", "localStoreId"]) ?? "",
    externalStoreId: readString(record, [
      "externalStoreId",
      "providerStoreId",
      "credereStoreId",
    ]),
    externalStoreAlias: readString(record, [
      "externalStoreAlias",
      "providerStoreAlias",
      "alias",
    ]),
  };
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function readBoolean(
  record: Record<string, unknown> | null,
  keys: readonly string[],
): boolean | null {
  for (const key of keys) {
    const value = record?.[key];
    if (typeof value === "boolean") return value;
  }
  return null;
}

function readString(
  record: Record<string, unknown> | null,
  keys: readonly string[],
): string | null {
  for (const key of keys) {
    const value = record?.[key];
    if (typeof value === "string" && value.trim()) return value;
  }
  return null;
}

function headers(auth: AgencyAuth): HeadersInit {
  const result: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (auth.accessToken) result.Authorization = `Bearer ${auth.accessToken}`;
  if (auth.clerkUserId) result["x-clerk-user-id"] = auth.clerkUserId;
  if (auth.userEmail) result["x-user-email"] = auth.userEmail;
  if (auth.userName) result["x-user-name"] = auth.userName;
  return result;
}

function endpoint(path: string, baseUrl = "/api/v1") {
  return `${baseUrl.replace(/\/$/, "")}${path.startsWith("/") ? path : `/${path}`}`;
}

async function readJson<T>(response: Response): Promise<T> {
  return readApiJson<T>(response, { feature: "Agencia" });
}

async function readVoid(response: Response): Promise<void> {
  return readApiVoid(response, { feature: "Agencia" });
}
