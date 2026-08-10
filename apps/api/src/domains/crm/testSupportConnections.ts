import type {
  CrmConnection,
  CrmConnectionRepository,
} from "./ports/crmConnectionRepository.js";

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

function readRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}
