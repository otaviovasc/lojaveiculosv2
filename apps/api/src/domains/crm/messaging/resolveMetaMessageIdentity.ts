import type { ParsedMetaWebhookEvent } from "./parseMetaWebhookEvents.js";
import type { CrmConnection } from "../ports/crmConnectionRepository.js";
import { findOrCreateWhatsappLead } from "../whatsapp/whatsappLeadLinking.js";
import {
  getCrmWhatsappRepository,
  type CrmServicePorts,
} from "../services/CrmService/serviceSupport.js";

type MetaMessageEvent = Extract<ParsedMetaWebhookEvent, { kind: "message" }>;

export async function resolveMetaMessageIdentity(
  ports: CrmServicePorts,
  connection: CrmConnection,
  event: MetaMessageEvent,
) {
  const repository = getCrmWhatsappRepository(ports);
  const isInstagram = event.provider === "composio_instagram";
  const instagramSession = isInstagram
    ? await repository.upsertSessionContext({
        buyerPhone: "",
        channel: "INSTAGRAM",
        channelExternalId: event.contactExternalId,
        connectionId: connection.id,
        storeId: connection.storeId,
        tenantId: connection.tenantId,
      })
    : null;
  const lead = await findOrCreateWhatsappLead(ports, {
    ...(!isInstagram ? { buyerPhone: event.contactExternalId } : {}),
    connectionId: connection.id,
    direction: "INBOUND",
    externalId: event.externalMessageId,
    ...(instagramSession?.leadId
      ? { preferredLeadId: instagramSession.leadId }
      : {}),
    source: isInstagram ? "instagram" : "whatsapp",
    storeId: connection.storeId,
    tenantId: connection.tenantId,
  });
  return {
    buyerPhone: isInstagram ? "" : event.contactExternalId,
    channel: isInstagram ? ("INSTAGRAM" as const) : ("WHATSAPP" as const),
    lead,
    repository,
  };
}
