import type {
  CrmConnection,
  CrmConnectionRepository,
} from "../../../../domains/crm/ports/crmConnectionRepository.js";

export function createMemoryCrmConnectionRepository(
  initialConnections: readonly CrmConnection[] = [],
): CrmConnectionRepository {
  const connections = [...initialConnections];

  return {
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
