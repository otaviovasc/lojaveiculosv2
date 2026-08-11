import type {
  CrmConnection,
  CrmConnectionRepository,
} from "../../../../domains/crm/ports/crmConnectionRepository.js";

export function createMemoryCrmConnectionRepository(
  initialConnections: readonly CrmConnection[] = [],
): CrmConnectionRepository {
  const connections = [...initialConnections];

  return {
    async archiveAbandonedZapiConnections(input) {
      const candidates = connections
        .filter(
          (connection) =>
            connection.provider === "zapi" &&
            connection.status === "sandbox" &&
            readDate(
              connection.metadata.updatedAt ?? connection.metadata.createdAt,
            ) <= input.cutoff &&
            connection.metadata.supportHold !== true &&
            connection.metadata.hasActiveSession !== true &&
            connection.metadata.hasMessage !== true,
        )
        .slice(0, input.limit);
      for (const connection of candidates) connection.status = "archived";
      return candidates;
    },
    async createConnection(input) {
      const duplicate = connections.some(
        (connection) =>
          connection.storeId === input.storeId &&
          connection.provider === input.provider &&
          connection.status !== "archived",
      );
      if (duplicate) {
        throw new Error("CRM_CONNECTION_PROVIDER_ALREADY_EXISTS");
      }
      const connection: CrmConnection = {
        credentialsRef: input.credentialsRef ?? {},
        displayName: input.displayName,
        externalConnectionId: input.externalConnectionId ?? null,
        externalInstanceId: input.externalInstanceId ?? null,
        id: crypto.randomUUID(),
        metadata: {
          createdAt: new Date().toISOString(),
          ...(input.metadata ?? {}),
        },
        phone: input.phone ?? null,
        provider: input.provider,
        status: input.status ?? "sandbox",
        storeId: input.storeId,
        tenantId: input.tenantId,
        webhookUrl: input.webhookUrl ?? null,
      };
      connections.push(connection);
      return connection;
    },
    async upsertOlxConnection(input) {
      const existing = connections.find(
        (item) =>
          item.provider === "olx_chat" &&
          item.storeId === input.storeId &&
          item.tenantId === input.tenantId &&
          item.status !== "archived",
      );
      if (existing) {
        existing.credentialsRef = input.credentialsRef ?? {};
        existing.displayName = input.displayName;
        existing.externalConnectionId = input.externalConnectionId ?? null;
        existing.metadata = input.metadata ?? {};
        existing.status = input.status ?? "error";
        existing.webhookUrl = input.webhookUrl ?? null;
        return existing;
      }
      const connection: CrmConnection = {
        credentialsRef: input.credentialsRef ?? {},
        displayName: input.displayName,
        externalConnectionId: input.externalConnectionId ?? null,
        externalInstanceId: null,
        id: crypto.randomUUID(),
        metadata: input.metadata ?? {},
        phone: null,
        provider: "olx_chat",
        status: input.status ?? "error",
        storeId: input.storeId,
        tenantId: input.tenantId,
        webhookUrl: input.webhookUrl ?? null,
      };
      connections.push(connection);
      return connection;
    },
    async configureInitialZapiCredentials(input) {
      const connection = connections.find(
        (item) =>
          item.id === input.connectionId &&
          item.storeId === input.storeId &&
          item.tenantId === input.tenantId &&
          item.provider === "zapi" &&
          item.status !== "archived",
      );
      if (!connection) return { status: "not_found" };
      const state = readZapiCredentialState(connection.credentialsRef);
      if (state !== "unconfigured") return { status: state };
      connection.credentialsRef = input.credentialsRef;
      return { connection, status: "configured" };
    },
    async claimZapiWebhookSetup(input) {
      const connection = connections.find(
        (item) =>
          item.id === input.connectionId &&
          item.storeId === input.storeId &&
          item.tenantId === input.tenantId &&
          item.provider === "zapi" &&
          item.status !== "archived",
      );
      if (!connection) return null;
      const setup = readRecord(connection.metadata.webhookSetup);
      if (setup.status === "configured") return null;
      const leaseExpiresAt = readDateOrNull(setup.leaseExpiresAt);
      if (setup.leaseOwner && leaseExpiresAt && leaseExpiresAt > input.now) {
        return null;
      }
      connection.metadata = {
        ...connection.metadata,
        webhookSetup: {
          ...setup,
          attemptCount:
            (typeof setup.attemptCount === "number" ? setup.attemptCount : 0) +
            1,
          lastErrorCode: null,
          leaseExpiresAt: input.leaseExpiresAt.toISOString(),
          leaseOwner: input.leaseOwner,
          status: "configuring",
          updatedAt: input.now.toISOString(),
        },
      };
      return connection;
    },
    async finishZapiWebhookSetup(input) {
      const connection = connections.find(
        (item) =>
          item.id === input.connectionId &&
          item.storeId === input.storeId &&
          item.tenantId === input.tenantId,
      );
      if (!connection) return null;
      const setup = readRecord(connection.metadata.webhookSetup);
      if (setup.leaseOwner !== input.leaseOwner) return null;
      connection.metadata = {
        ...connection.metadata,
        webhookSetup: readRecord(input.metadata.webhookSetup),
      };
      return connection;
    },
    async findConnectionByExternalId(input) {
      return (
        connections.find(
          (connection) =>
            connection.externalConnectionId === input.externalConnectionId &&
            input.providers.includes(connection.provider),
        ) ?? null
      );
    },
    async findConnectionById(connectionId) {
      return (
        connections.find((connection) => connection.id === connectionId) ?? null
      );
    },
    async listConnections(input) {
      return connections
        .filter((connection) => connection.storeId === input.storeId)
        .filter((connection) => connection.tenantId === input.tenantId)
        .filter(
          (connection) =>
            !input.providers?.length ||
            input.providers.includes(connection.provider),
        );
    },
    async updateConnection(input) {
      const connection = connections.find(
        (item) =>
          item.id === input.connectionId &&
          item.storeId === input.storeId &&
          item.tenantId === input.tenantId,
      );
      if (!connection) return null;
      if (input.credentialsRef)
        connection.credentialsRef = input.credentialsRef;
      if (input.displayName) connection.displayName = input.displayName;
      if (input.externalConnectionId !== undefined) {
        connection.externalConnectionId = input.externalConnectionId;
      }
      if (input.externalInstanceId !== undefined) {
        connection.externalInstanceId = input.externalInstanceId;
      }
      if (input.metadata) connection.metadata = input.metadata;
      if (input.phone !== undefined) connection.phone = input.phone;
      if (input.status) connection.status = input.status;
      if (input.webhookUrl !== undefined)
        connection.webhookUrl = input.webhookUrl;
      return connection;
    },
  };
}

function readDate(value: unknown) {
  const parsed = typeof value === "string" ? new Date(value) : new Date();
  return Number.isNaN(parsed.getTime()) ? new Date() : parsed;
}

function readDateOrNull(value: unknown) {
  if (typeof value !== "string") return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function readRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function readZapiCredentialState(credentialsRef: Record<string, unknown>) {
  const stored = readRecord(credentialsRef.stored);
  const instanceId = readConfiguredString(stored.instanceId);
  const instanceToken = readConfiguredString(stored.instanceToken);
  if (instanceId && instanceToken) return "already_configured" as const;
  if (instanceId || instanceToken) return "partial_state" as const;
  return "unconfigured" as const;
}

function readConfiguredString(value: unknown) {
  return typeof value === "string" && value.trim().length > 0;
}
