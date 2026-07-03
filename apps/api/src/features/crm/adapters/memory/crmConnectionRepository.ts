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
        (item) => item.id === input.connectionId,
      );
      if (!connection) return null;
      if (input.metadata) connection.metadata = input.metadata;
      if (input.phone !== undefined) connection.phone = input.phone;
      if (input.status) connection.status = input.status;
      return connection;
    },
  };
}
