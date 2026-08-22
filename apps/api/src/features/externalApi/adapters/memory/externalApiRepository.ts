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
  body: unknown;
  clientId: string;
  contentType: string | null;
  idempotencyKey: string;
  requestFingerprint: string;
  status: "completed" | "failed" | "started";
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
    async completeIdempotencyKey(input) {
      const row = findIdempotencyRow(idempotencyKeys, input);
      if (!row || row.status !== "started") return false;
      row.body = structuredClone(input.body);
      row.contentType = input.contentType;
      row.status = "completed";
      row.statusCode = input.statusCode;
      return true;
    },
    async createClient(input) {
      const now = new Date();
      const client: ClientRow = {
        createdAt: now,
        id: `api_client_${clients.length + 1}`,
        keyHash: input.keyHash,
        keyId: `api_key_${clients.length + 1}`,
        keyPrefixes: [input.keyPrefix],
        lastUsedAt: null,
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
        .map((client) =>
          toClient(client, latestRequestAt(requestLogs, client.id)),
        );
    },
    async failIdempotencyKey(input) {
      const row = findIdempotencyRow(idempotencyKeys, input);
      if (!row || row.status !== "started") return false;
      row.status = "failed";
      row.statusCode = input.statusCode;
      return true;
    },
    async recordRequest(input) {
      requestLogs.push({
        clientId: input.clientId,
        createdAt: new Date(),
      });
    },
    async reserveIdempotencyKey(input) {
      const existing = idempotencyKeys.find(
        (item) =>
          item.clientId === input.clientId &&
          item.idempotencyKey === input.idempotencyKey,
      );
      if (existing) {
        if (existing.requestFingerprint === input.requestFingerprint) {
          if (
            existing.status === "completed" &&
            existing.statusCode !== null &&
            existing.contentType
          ) {
            return {
              body: structuredClone(existing.body),
              contentType: existing.contentType,
              kind: "replay",
              statusCode: existing.statusCode,
            };
          }
          if (existing.status === "failed") {
            return { kind: "failed", statusCode: existing.statusCode };
          }
          return { kind: "in_flight" };
        }
        return {
          kind: "conflict",
          requestFingerprint: existing.requestFingerprint,
        };
      }
      idempotencyKeys.push({
        body: null,
        clientId: input.clientId,
        contentType: null,
        idempotencyKey: input.idempotencyKey,
        requestFingerprint: input.requestFingerprint,
        status: "started",
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

function findIdempotencyRow(
  rows: IdempotencyRow[],
  input: {
    clientId: string;
    idempotencyKey: string;
    requestFingerprint: string;
  },
) {
  return rows.find(
    (row) =>
      row.clientId === input.clientId &&
      row.idempotencyKey === input.idempotencyKey &&
      row.requestFingerprint === input.requestFingerprint,
  );
}

function toClient(
  row: ClientRow,
  lastUsedAt: Date | null = row.lastUsedAt,
): ExternalApiClient {
  return {
    createdAt: row.createdAt,
    id: row.id,
    keyPrefixes: row.keyPrefixes,
    lastUsedAt,
    name: row.name,
    scopes: row.scopes,
    status: row.status,
    storeId: row.storeId,
    tenantId: row.tenantId,
    updatedAt: row.updatedAt,
  };
}

function latestRequestAt(requestLogs: RequestLogRow[], clientId: string) {
  return requestLogs.reduce<Date | null>(
    (latest, log) =>
      log.clientId === clientId && (!latest || log.createdAt > latest)
        ? log.createdAt
        : latest,
    null,
  );
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
