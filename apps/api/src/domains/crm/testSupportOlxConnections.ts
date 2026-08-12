import type {
  CrmConnection,
  CrmConnectionRepository,
} from "./ports/crmConnectionRepository.js";
import { readRecord } from "./testSupportConnectionValues.js";

export function upsertTestOlxConnection(
  connections: CrmConnection[],
  input: Parameters<CrmConnectionRepository["upsertOlxConnection"]>[0],
) {
  const existing = connections.find(
    (item) =>
      item.provider === "olx_chat" &&
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
      stored: {
        ...nextStored,
        ...(currentStored.webhookSecret
          ? { webhookSecret: currentStored.webhookSecret }
          : {}),
      },
    };
    return { connection: existing, replacedConnectionId: null };
  }
  if (existing) existing.status = "archived";
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
  return { connection, replacedConnectionId: existing?.id ?? null };
}
