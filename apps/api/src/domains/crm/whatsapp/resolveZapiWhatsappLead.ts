import type { CrmConnection } from "../ports/crmConnectionRepository.js";
import type { ParsedZapiInboundMessage } from "./parseZapiInboundMessage.js";
import { findOrCreateWhatsappLead } from "./whatsappLeadLinking.js";
import {
  getCrmWhatsappRepository,
  type CrmServicePorts,
} from "../services/CrmService/serviceSupport.js";

export async function resolveZapiWhatsappLead(
  ports: CrmServicePorts,
  input: {
    connection: CrmConnection;
    message: ParsedZapiInboundMessage;
  },
) {
  const session = await getCrmWhatsappRepository(ports).upsertSessionContext({
    ...(input.message.chatLid ? { buyerChatLid: input.message.chatLid } : {}),
    ...(input.message.buyerName ? { buyerName: input.message.buyerName } : {}),
    buyerPhone: input.message.phone,
    channel: "WHATSAPP",
    connectionId: input.connection.id,
    storeId: input.connection.storeId,
    tenantId: input.connection.tenantId,
  });
  return findOrCreateWhatsappLead(ports, {
    buyerName: input.message.buyerName ?? null,
    buyerPhone: input.message.phone,
    connectionId: input.connection.id,
    direction: input.message.fromMe ? "OUTBOUND" : "INBOUND",
    externalId: input.message.externalId,
    preferredLeadId: session.leadId,
    storeId: input.connection.storeId,
    tenantId: input.connection.tenantId,
  });
}
