import type {
  CrmConnection,
  CrmConnectionRepository,
} from "./ports/crmConnectionRepository.js";
import {
  readConfiguredString,
  readRecord,
} from "./testSupportConnectionValues.js";
export function createTestCrmConnectionRepository(
  initialConnections: readonly CrmConnection[] = [],
): CrmConnectionRepository {
  const connections = [...initialConnections];
  return {
    async archiveAbandonedZapiConnections() {
      return [];
    },
    async createConnection(input) {
      const connection: CrmConnection = {
        credentialsRef: input.credentialsRef ?? {},
        displayName: input.displayName,
        externalConnectionId: input.externalConnectionId ?? null,
        externalInstanceId: input.externalInstanceId ?? null,
        id: crypto.randomUUID(),
        metadata: input.metadata ?? {},
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
        Object.assign(existing, input, { provider: "olx_chat" as const });
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
      const stored = readRecord(connection.credentialsRef.stored);
      const instanceId = readConfiguredString(stored.instanceId);
      const instanceToken = readConfiguredString(stored.instanceToken);
      if (instanceId && instanceToken) return { status: "already_configured" };
      if (instanceId || instanceToken) return { status: "partial_state" };
      connection.credentialsRef = input.credentialsRef;
      return { connection, status: "configured" };
    },
    async claimZapiWebhookSetup(input) {
      const connection = connections.find(
        (item) =>
          item.id === input.connectionId &&
          item.storeId === input.storeId &&
          item.tenantId === input.tenantId,
      );
      if (!connection) return null;
      const setup = readRecord(connection.metadata.webhookSetup);
      const expiresAt =
        typeof setup.leaseExpiresAt === "string"
          ? new Date(setup.leaseExpiresAt)
          : null;
      if (
        setup.status === "configured" ||
        (setup.leaseOwner &&
          expiresAt &&
          !Number.isNaN(expiresAt.getTime()) &&
          expiresAt > input.now)
      ) {
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
    async claimOlxWebhookSetup(input) {
      const connection = connections.find(
        (item) =>
          item.id === input.connectionId &&
          item.provider === "olx_chat" &&
          item.storeId === input.storeId &&
          item.tenantId === input.tenantId,
      );
      if (!connection) return null;
      const setup = readRecord(connection.metadata.webhookSetup);
      const leaseExpiresAt =
        typeof setup.leaseExpiresAt === "string"
          ? new Date(setup.leaseExpiresAt)
          : null;
      if (
        setup.status === "configured" ||
        (setup.leaseOwner && leaseExpiresAt && leaseExpiresAt > input.now)
      )
        return null;
      connection.metadata = {
        ...connection.metadata,
        webhookSetup: {
          ...setup,
          attemptCount:
            (typeof setup.attemptCount === "number" ? setup.attemptCount : 0) +
            1,
          leaseExpiresAt: input.leaseExpiresAt.toISOString(),
          leaseOwner: input.leaseOwner,
          status: "configuring",
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
      if (
        readRecord(connection.metadata.webhookSetup).leaseOwner !==
        input.leaseOwner
      ) {
        return null;
      }
      connection.metadata = {
        ...connection.metadata,
        webhookSetup: readRecord(input.metadata.webhookSetup),
      };
      return connection;
    },
    async finishOlxWebhookSetup(input) {
      const connection = connections.find(
        (item) =>
          item.id === input.connectionId &&
          item.storeId === input.storeId &&
          item.tenantId === input.tenantId,
      );
      if (
        !connection ||
        readRecord(connection.metadata.webhookSetup).leaseOwner !==
          input.leaseOwner
      )
        return null;
      connection.metadata = {
        ...connection.metadata,
        webhookSetup: readRecord(input.metadata.webhookSetup),
      };
      connection.status =
        readRecord(input.metadata.webhookSetup).status === "configured"
          ? "active"
          : "error";
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
      return connections.find((item) => item.id === connectionId) ?? null;
    },
    async listConnections(input) {
      return connections.filter(
        (connection) =>
          connection.storeId === input.storeId &&
          connection.tenantId === input.tenantId &&
          (!input.providers?.length ||
            input.providers.includes(connection.provider)),
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
      Object.assign(connection, {
        ...(input.credentialsRef
          ? { credentialsRef: input.credentialsRef }
          : {}),
        ...(input.displayName ? { displayName: input.displayName } : {}),
        ...(input.externalConnectionId !== undefined
          ? { externalConnectionId: input.externalConnectionId }
          : {}),
        ...(input.externalInstanceId !== undefined
          ? { externalInstanceId: input.externalInstanceId }
          : {}),
        ...(input.metadata ? { metadata: input.metadata } : {}),
        ...(input.phone !== undefined ? { phone: input.phone } : {}),
        ...(input.status ? { status: input.status } : {}),
        ...(input.webhookUrl !== undefined
          ? { webhookUrl: input.webhookUrl }
          : {}),
      });
      return connection;
    },
  };
}
