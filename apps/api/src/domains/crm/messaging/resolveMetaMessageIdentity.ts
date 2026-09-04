import type { ParsedMetaWebhookEvent } from "./parseMetaWebhookEvents.js";
import type { CrmConnection } from "../ports/crmConnectionRepository.js";
import { findOrCreateCrmMessagingLead } from "./leadLinking.js";
import {
  getCrmConversationRepository,
  type CrmServicePorts,
} from "../services/CrmService/serviceSupport.js";

type MetaMessageEvent = Extract<ParsedMetaWebhookEvent, { kind: "message" }>;

export async function resolveMetaMessageIdentity(
  ports: CrmServicePorts,
  connection: CrmConnection,
  event: MetaMessageEvent,
) {
  const repository = getCrmConversationRepository(ports);
  const isInstagram = event.channel === "instagram";
  const instagramSession = isInstagram
    ? await repository.upsertConversationCycleContext({
        customerPhone: "",
        channel: "INSTAGRAM",
        externalThreadId: event.contactExternalId,
        connectionId: connection.id,
        storeId: connection.storeId,
        tenantId: connection.tenantId,
      })
    : null;
  const lead = await findOrCreateCrmMessagingLead(ports, {
    ...(!isInstagram ? { buyerPhone: event.contactExternalId } : {}),
    channel: isInstagram ? "INSTAGRAM" : "WHATSAPP",
    connectionId: connection.id,
    direction: event.direction,
    externalId: event.externalMessageId,
    ...(instagramSession?.leadId
      ? { preferredLeadId: instagramSession.leadId }
      : {}),
    source: isInstagram ? "instagram" : "whatsapp",
    storeId: connection.storeId,
    tenantId: connection.tenantId,
  });
  return {
    customerPhone: isInstagram ? "" : event.contactExternalId,
    channel: isInstagram ? ("INSTAGRAM" as const) : ("WHATSAPP" as const),
    lead,
    repository,
  };
}
