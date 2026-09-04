import type {
  CrmConnection,
  CrmConnectionRepository,
} from "./ports/crmConnectionRepository.js";
import {
  normalizeTestCrmConnection,
  readConfiguredString,
  readRecord,
} from "./testSupportConnectionValues.js";

type ConfigureInitialZapiCredentialsInput = Parameters<
  CrmConnectionRepository["configureInitialZapiCredentials"]
>[0];

export function configureInitialTestZapiCredentials(
  connections: CrmConnection[],
  input: ConfigureInitialZapiCredentialsInput,
) {
  const connection = connections.find(
    (item) =>
      item.id === input.connectionId &&
      item.storeId === input.storeId &&
      item.tenantId === input.tenantId &&
      item.provider === "zapi" &&
      item.status !== "archived",
  );
  if (!connection) return { status: "not_found" as const };
  const stored = readRecord(connection.credentialsRef.stored);
  const clientToken = readConfiguredString(stored.clientToken);
  const instanceId = readConfiguredString(stored.instanceId);
  const instanceToken = readConfiguredString(stored.instanceToken);
  if (clientToken && instanceId && instanceToken) {
    return { status: "already_configured" as const };
  }
  if (clientToken || instanceId || instanceToken) {
    return { status: "partial_state" as const };
  }
  connection.credentialsRef = input.credentialsRef;
  connection.externalInstanceId = null;
  return {
    connection: normalizeTestCrmConnection(connection),
    status: "configured" as const,
  };
}
