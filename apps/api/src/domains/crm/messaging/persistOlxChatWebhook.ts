import type { CrmConnection } from "../ports/crmConnectionRepository.js";
import type { ParsedOlxChatWebhook } from "./parseOlxChatWebhook.js";
import {
  runCrmTransaction,
  type CrmServicePorts,
} from "../services/CrmService/serviceSupport.js";
import { createCrmMessageActivity } from "./createCrmMessageActivity.js";
import { findOrCreateCrmMessagingLead } from "./leadLinking.js";
import { stageOlxWebhookEffects } from "./olxWebhookEffectOutbox.js";
import { persistCanonicalInbound } from "./persistCanonicalInbound.js";
import { hydrateCanonicalInbound } from "./hydrateCanonicalInbound.js";

export function persistOlxChatWebhook(
  ports: CrmServicePorts,
  input: {
    connection: CrmConnection;
    parsed: ParsedOlxChatWebhook;
    providerEventId: string;
  },
) {
  if (input.parsed.origin !== "buyer") {
    throw new Error("Only buyer-origin OLX Chat messages can be persisted.");
  }
  return runCrmTransaction(ports, async (transactionPorts) => {
    const { connection, parsed } = input;
    const lead = await findOrCreateCrmMessagingLead(transactionPorts, {
      buyerEmail: parsed.buyerEmail,
      buyerName: parsed.customerDisplayName,
      buyerPhone: parsed.customerPhone || null,
      channel: "OLX_CHAT",
      connectionId: connection.id,
      direction: "INBOUND",
      externalId: parsed.externalMessageId,
      source: "olx",
      storeId: connection.storeId,
      tenantId: connection.tenantId,
    });
    const canonical = await persistCanonicalInbound(transactionPorts, {
      channel: "olx_chat",
      connectionId: connection.id,
      contactDisplayName: parsed.customerDisplayName ?? null,
      content: parsed.message,
      customerChatId: parsed.chatId,
      externalThreadId: parsed.chatId,
      identity: {
        kind: "provider_subject",
        normalizedValue: `olx:${connection.id}:${parsed.chatId}`,
      },
      leadId: lead.id,
      occurredAt: parsed.timestamp,
      messageType: "text",
      metadata: {
        chatId: parsed.chatId,
        listId: parsed.listId,
        provider: "olx",
        senderType: parsed.senderType,
      },
      provider: "olx",
      providerMessageId: parsed.externalMessageId,
      secondaryPhone: parsed.customerPhone || null,
      sender: parsed.senderType === "system" ? "system" : "customer",
      senderOrigin: parsed.senderType === "system" ? "system" : "customer",
      source: "olx",
      storeId: connection.storeId,
      tenantId: connection.tenantId,
    });
    const persisted = await hydrateCanonicalInbound(transactionPorts, {
      canonical,
      connection,
      message: { externalId: parsed.externalMessageId },
    });
    if (canonical.created) {
      await createCrmMessageActivity(transactionPorts, {
        connectionId: connection.id,
        content: parsed.message,
        direction: "inbound",
        leadId: lead.id,
        messageExternalId: parsed.externalMessageId,
        occurredAt: parsed.timestamp,
        provider: "olx",
        cycleId: canonical.cycleId,
        storeId: connection.storeId,
        tenantId: connection.tenantId,
      });
      await stageOlxWebhookEffects(transactionPorts, {
        connection,
        message: persisted.message,
        providerEventId: input.providerEventId,
        conversationCycle: persisted.conversationCycle,
      });
    }
    return persisted;
  });
}
