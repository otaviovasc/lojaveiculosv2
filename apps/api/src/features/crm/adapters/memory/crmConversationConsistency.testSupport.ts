import type { IngestCrmMessageInput } from "../../../../domains/crm/ports/crmConversationRepository.js";

export const crmConversationConsistencyScope = {
  storeId: "store-1" as never,
  tenantId: "tenant-1" as never,
};

export function createInboundMessage(
  externalId: string,
  content = "Ola",
): IngestCrmMessageInput {
  return {
    customerPhone: "5511999999999",
    channel: "WHATSAPP",
    connectionId: "connection-1",
    content,
    direction: "INBOUND",
    externalId,
    metadata: {},
    providerTimestamp: new Date("2026-08-10T15:00:00.000Z"),
    senderOrigin: "customer",
    senderType: "CUSTOMER",
    status: "DELIVERED",
    ...crmConversationConsistencyScope,
    type: "TEXT",
  };
}
