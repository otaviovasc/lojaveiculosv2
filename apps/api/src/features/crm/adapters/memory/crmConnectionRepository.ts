import type {
  CrmConnection,
  CrmConnectionRepository,
} from "../../../../domains/crm/ports/crmConnectionRepository.js";
import {
  canonicalCrmConnectionMetadata,
  projectCanonicalCrmConnectionRow,
  toCanonicalRoutingConnection,
} from "../../../../domains/crm/ports/crmChannelConnectionProjection.js";
import type { CrmRoutingConnectionRepository } from "../../../../domains/crm/ports/crmRoutingConnectionRepository.js";
import { createMemoryCrmConnectionSetupMethods } from "./crmConnectionRepositorySetup.js";

export type MemoryCrmConnectionRepository = CrmConnectionRepository & {
  routingConnectionRepository: CrmRoutingConnectionRepository;
};

export function createMemoryCrmConnectionRepository(
  initialConnections: readonly CrmConnection[] = [],
): MemoryCrmConnectionRepository {
  const connections = initialConnections.map(normalizeConnection);

  const repository: CrmConnectionRepository = {
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
          connection.channel === input.channel &&
          connection.provider === input.provider &&
          connection.status !== "archived",
      );
      if (duplicate) {
        throw new Error("CRM_CONNECTION_PROVIDER_ALREADY_EXISTS");
      }
      const connection: CrmConnection = {
        broker: input.broker,
        channel: input.channel,
        credentialsRef: input.credentialsRef ?? {},
        displayName: input.displayName,
        externalConnectionId: input.externalConnectionId ?? null,
        externalInstanceId: input.externalInstanceId ?? null,
        id: crypto.randomUUID(),
        metadata: { createdAt: new Date().toISOString(), ...input.metadata },
        phone: input.phone ?? null,
        provider: input.provider,
        revision: 0,
        status: input.status ?? "sandbox",
        storeId: input.storeId,
        tenantId: input.tenantId,
        webhookUrl: input.webhookUrl ?? null,
      };
      connections.push(connection);
      return normalizeConnection(connection);
    },
    async upsertOlxConnection(input) {
      const existing = connections.find(
        (item) =>
          item.channel === "olx_chat" &&
          item.provider === "olx" &&
          item.storeId === input.storeId &&
          item.tenantId === input.tenantId &&
          item.status !== "archived",
      );
      if (
        existing &&
        existing.externalConnectionId === input.externalConnectionId &&
        input.externalConnectionId !== null
      ) {
        const currentStored = readRecord(existing.credentialsRef.stored);
        const nextStored = readRecord(input.credentialsRef?.stored);
        existing.credentialsRef = {
          ...existing.credentialsRef,
          stored: {
            ...nextStored,
            ...(currentStored.webhookSecret
              ? { webhookSecret: currentStored.webhookSecret }
              : {}),
          },
        };
        existing.displayName = input.displayName;
        return {
          connection: normalizeConnection(existing),
          replacedConnectionId: null,
        };
      }
      if (existing) existing.status = "archived";
      const connection: CrmConnection = {
        broker: "direct",
        channel: "olx_chat",
        credentialsRef: input.credentialsRef ?? {},
        displayName: input.displayName,
        externalConnectionId: input.externalConnectionId ?? null,
        externalInstanceId: null,
        id: crypto.randomUUID(),
        metadata: input.metadata ?? {},
        phone: null,
        provider: "olx",
        status: input.status ?? "error",
        storeId: input.storeId,
        tenantId: input.tenantId,
        webhookUrl: input.webhookUrl ?? null,
      };
      connections.push(connection);
      return {
        connection: normalizeConnection(connection),
        replacedConnectionId: existing?.id ?? null,
      };
    },
    ...createMemoryCrmConnectionSetupMethods(connections, normalizeConnection),
    async findConnectionByExternalId(input) {
      return (
        connections.find(
          (connection) =>
            connection.externalConnectionId === input.externalConnectionId &&
            input.channels.includes(connection.channel) &&
            input.providers.includes(connection.provider) &&
            (!input.brokers?.length ||
              input.brokers.includes(connection.broker)),
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
        )
        .filter(
          (connection) =>
            !input.channels?.length ||
            input.channels.includes(connection.channel),
        )
        .filter(
          (connection) =>
            !input.brokers?.length || input.brokers.includes(connection.broker),
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
      if (
        input.expectedRevision !== undefined &&
        (connection.revision ?? 0) !== input.expectedRevision
      ) {
        return null;
      }
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
      connection.revision = (connection.revision ?? 0) + 1;
      return normalizeConnection(connection);
    },
  };
  const routingConnectionRepository: CrmRoutingConnectionRepository = {
    async listConnections(scope) {
      return connections
        .filter(
          (connection) =>
            connection.storeId === scope.storeId &&
            connection.tenantId === scope.tenantId,
        )
        .map(toCanonicalRoutingConnection);
    },
  };
  return Object.assign(repository, { routingConnectionRepository });
}

function normalizeConnection(connection: CrmConnection) {
  connection.metadata = canonicalCrmConnectionMetadata({
    metadata: connection.metadata,
  });
  connection.canonical = projectCanonicalCrmConnectionRow({
    broker: connection.broker,
    channel: connection.channel,
    credentialsRef: connection.credentialsRef,
    metadata: connection.metadata,
    provider: connection.provider,
    state: connection.status,
  });
  return connection;
}

function readDate(value: unknown) {
  const parsed = typeof value === "string" ? new Date(value) : new Date();
  return Number.isNaN(parsed.getTime()) ? new Date() : parsed;
}

function readRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}
