import type { CrmConnection } from "../ports/crmConnectionRepository.js";
import type { ParsedZapiInboundMessage } from "./parseZapiInboundMessage.js";
import { findOrCreateCrmMessagingLead } from "../messaging/leadLinking.js";
import {
  getCrmConversationRepository,
  type CrmServicePorts,
} from "../services/CrmService/serviceSupport.js";

export async function resolveZapiWhatsappLead(
  ports: CrmServicePorts,
  input: {
    connection: CrmConnection;
    message: ParsedZapiInboundMessage;
  },
) {
  const conversationCycle = await getCrmConversationRepository(
    ports,
  ).upsertConversationCycleContext({
    ...(input.message.chatLid ? { customerChatId: input.message.chatLid } : {}),
    ...(input.message.customerDisplayName
      ? { customerDisplayName: input.message.customerDisplayName }
      : {}),
    customerPhone: input.message.phone,
    channel: "WHATSAPP",
    connectionId: input.connection.id,
    storeId: input.connection.storeId,
    tenantId: input.connection.tenantId,
  });
  return findOrCreateCrmMessagingLead(ports, {
    buyerName: input.message.customerDisplayName ?? null,
    buyerPhone: input.message.phone,
    channel: "WHATSAPP",
    connectionId: input.connection.id,
    direction: input.message.fromMe ? "OUTBOUND" : "INBOUND",
    externalId: input.message.externalId,
    preferredLeadId: conversationCycle.leadId,
    source: "whatsapp",
    storeId: input.connection.storeId,
    tenantId: input.connection.tenantId,
  });
}
