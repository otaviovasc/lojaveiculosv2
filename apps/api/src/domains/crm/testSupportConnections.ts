import type {
  CrmConnection,
  CrmConnectionRepository,
} from "./ports/crmConnectionRepository.js";
import type { CrmRoutingConnectionRepository } from "./ports/crmRoutingConnectionRepository.js";
import type { CrmRoutingPolicyRepository } from "./ports/crmRoutingPolicyRepository.js";
import { createTestCrmRoutingRepositories } from "./testSupportRoutingRepositories.js";
import {
  normalizeTestCrmConnection,
  readConfiguredString,
  readRecord,
} from "./testSupportConnectionValues.js";
import { upsertTestOlxConnection } from "./testSupportOlxConnections.js";
import { updateTestCrmConnection } from "./testSupportConnectionUpdates.js";
export function createTestCrmConnectionRepository(
  initialConnections: readonly CrmConnection[] = [],
): CrmConnectionRepository & {
  routingConnectionRepository: CrmRoutingConnectionRepository;
  routingPolicyRepository: CrmRoutingPolicyRepository;
} {
  const connections = initialConnections.map(normalizeTestCrmConnection);
  const repository: CrmConnectionRepository = {
    async archiveAbandonedZapiConnections() {
      return [];
    },
    async createConnection(input) {
      const connection: CrmConnection = {
        broker: input.broker,
        channel: input.channel,
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
      return normalizeTestCrmConnection(connection);
    },
    async upsertOlxConnection(input) {
      const result = await upsertTestOlxConnection(connections, input);
      return {
        ...result,
        connection: normalizeTestCrmConnection(result.connection),
      };
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
      connection.externalInstanceId = input.externalInstanceId;
      return {
        connection: normalizeTestCrmConnection(connection),
        status: "configured",
      };
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
      return normalizeTestCrmConnection(connection);
    },
    async claimOlxWebhookSetup(input) {
      const connection = connections.find(
        (item) =>
          item.id === input.connectionId &&
          item.channel === "olx_chat" &&
          item.provider === "olx" &&
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
        (setup.status === "configured" && !input.allowConfigured) ||
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
      return normalizeTestCrmConnection(connection);
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
      return normalizeTestCrmConnection(connection);
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
      connection.status = ["configured", "partial"].includes(
        String(readRecord(input.metadata.webhookSetup).status),
      )
        ? "active"
        : "error";
      return normalizeTestCrmConnection(connection);
    },
    async findConnectionByExternalId(input) {
      return (
        connections.find(
          (connection) =>
            connection.externalConnectionId === input.externalConnectionId &&
            input.channels.includes(connection.channel) &&
            (!input.brokers?.length ||
              input.brokers.includes(connection.broker)) &&
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
          (!input.channels?.length ||
            input.channels.includes(connection.channel)) &&
          (!input.brokers?.length ||
            input.brokers.includes(connection.broker)) &&
          (!input.providers?.length ||
            input.providers.includes(connection.provider)),
      );
    },
    async updateConnection(input) {
      return updateTestCrmConnection(connections, input);
    },
  };
  const { routingConnectionRepository, routingPolicyRepository } =
    createTestCrmRoutingRepositories(connections);
  return Object.assign(repository, {
    routingConnectionRepository,
    routingPolicyRepository,
  });
}

export function createTestCrmRoutingPorts(
  initialConnections: readonly CrmConnection[] = [],
) {
  const repository = createTestCrmConnectionRepository(initialConnections);
  return {
    crmRoutingConnectionRepository: repository.routingConnectionRepository,
    crmRoutingPolicyRepository: repository.routingPolicyRepository,
  };
}
