import type { IngestCrmWhatsappMessageInput } from "../../../../domains/crm/ports/crmWhatsappRepository.js";

export const crmWhatsappConsistencyScope = {
  storeId: "store-1" as never,
  tenantId: "tenant-1" as never,
};

export function createInboundMessage(
  externalId: string,
  content = "Ola",
): IngestCrmWhatsappMessageInput {
  return {
    buyerPhone: "5511999999999",
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
    ...crmWhatsappConsistencyScope,
    type: "TEXT",
  };
}
