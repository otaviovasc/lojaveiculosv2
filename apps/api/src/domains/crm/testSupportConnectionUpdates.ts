import type {
  CrmConnection,
  CrmConnectionRepository,
} from "./ports/crmConnectionRepository.js";
import { normalizeTestCrmConnection } from "./testSupportConnectionValues.js";

export function updateTestCrmConnection(
  connections: CrmConnection[],
  input: Parameters<CrmConnectionRepository["updateConnection"]>[0],
) {
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
  Object.assign(connection, {
    ...(input.credentialsRef ? { credentialsRef: input.credentialsRef } : {}),
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
    ...(input.webhookUrl !== undefined ? { webhookUrl: input.webhookUrl } : {}),
  });
  connection.revision = (connection.revision ?? 0) + 1;
  return normalizeTestCrmConnection(connection);
}
