import type { EntitlementKey, PermissionKey } from "@lojaveiculosv2/shared";
import type {
  CreateExternalApiClientInput,
  ExternalApiAuthenticatedClient,
  ExternalApiClient,
  ExternalApiRepository,
} from "../../../../domains/externalApi/ports/externalApiRepository.js";

type ClientRow = ExternalApiClient & {
  keyHash: string;
  keyId: string;
};

type RequestLogRow = {
  clientId: string;
  createdAt: Date;
};

type IdempotencyRow = {
  clientId: string;
  idempotencyKey: string;
  requestFingerprint: string;
  statusCode: number | null;
};

export function createMemoryExternalApiRepository(): ExternalApiRepository {
  const clients: ClientRow[] = [];
  const idempotencyKeys: IdempotencyRow[] = [];
  const requestLogs: RequestLogRow[] = [];

  return {
    async authenticateByKeyHash(input) {
      const client = clients.find(
        (item) => item.keyHash === input.keyHash && item.status === "active",
      );
      if (!client) return null;
      return toAuthenticatedClient(client);
    },
    async countRecentRequests(input) {
      return requestLogs.filter(
        (log) =>
          log.clientId === input.clientId && log.createdAt >= input.since,
      ).length;
    },
    async createClient(input) {
      const now = new Date();
      const client: ClientRow = {
        createdAt: now,
        id: `api_client_${clients.length + 1}`,
        keyHash: input.keyHash,
        keyId: `api_key_${clients.length + 1}`,
        keyPrefixes: [input.keyPrefix],
        name: input.name,
        scopes: input.scopes,
        status: "active",
        storeId: input.storeId,
        tenantId: input.tenantId,
        updatedAt: now,
      };
      clients.push(client);
      return toClient(client);
    },
    async listClients(input) {
      return clients
        .filter(
          (client) =>
            client.storeId === input.storeId &&
            client.tenantId === input.tenantId,
        )
        .map(toClient);
    },
    async recordRequest(input) {
      requestLogs.push({
        clientId: input.clientId,
        createdAt: new Date(),
      });
      if (input.idempotencyKey) {
        const row = idempotencyKeys.find(
          (item) =>
            item.clientId === input.clientId &&
            item.idempotencyKey === input.idempotencyKey,
        );
        if (row) row.statusCode = input.statusCode;
      }
    },
    async reserveIdempotencyKey(input) {
      const existing = idempotencyKeys.find(
        (item) =>
          item.clientId === input.clientId &&
          item.idempotencyKey === input.idempotencyKey,
      );
      if (existing?.requestFingerprint === input.requestFingerprint) {
        return { kind: "duplicate", statusCode: existing.statusCode };
      }
      if (existing) {
        return {
          kind: "conflict",
          requestFingerprint: existing.requestFingerprint,
        };
      }
      idempotencyKeys.push({
        clientId: input.clientId,
        idempotencyKey: input.idempotencyKey,
        requestFingerprint: input.requestFingerprint,
        statusCode: null,
      });
      return { kind: "created" };
    },
    async revokeClient(input) {
      const client = clients.find(
        (item) =>
          item.id === input.clientId &&
          item.storeId === input.storeId &&
          item.tenantId === input.tenantId,
      );
      if (!client) return null;
      client.status = "revoked";
      client.updatedAt = new Date();
      return toClient(client);
    },
  };
}

function toClient(row: ClientRow): ExternalApiClient {
  return {
    createdAt: row.createdAt,
    id: row.id,
    keyPrefixes: row.keyPrefixes,
    name: row.name,
    scopes: row.scopes,
    status: row.status,
    storeId: row.storeId,
    tenantId: row.tenantId,
    updatedAt: row.updatedAt,
  };
}

function toAuthenticatedClient(row: ClientRow): ExternalApiAuthenticatedClient {
  return {
    clientId: row.id,
    clientName: row.name,
    entitlements: ["external_api"] satisfies EntitlementKey[],
    keyId: row.keyId,
    keyPrefix: row.keyPrefixes[0] ?? "memory",
    scopes: row.scopes as PermissionKey[],
    storeId: row.storeId,
    tenantId: row.tenantId,
  };
}
