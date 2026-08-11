import type { CrmConnection } from "../ports/crmConnectionRepository.js";
import type { ParsedOlxChatWebhook } from "./parseOlxChatWebhook.js";
import {
  getCrmWhatsappRepository,
  runCrmTransaction,
  type CrmServicePorts,
} from "../services/CrmService/serviceSupport.js";
import { createWhatsappMessageActivity } from "../whatsapp/createWhatsappMessageActivity.js";
import { findOrCreateWhatsappLead } from "../whatsapp/whatsappLeadLinking.js";
import { stageOlxWebhookEffects } from "./olxWebhookEffectOutbox.js";

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
    const repository = getCrmWhatsappRepository(transactionPorts);
    const session = await repository.upsertSessionContext({
      ...(parsed.buyerName ? { buyerName: parsed.buyerName } : {}),
      buyerPhone: parsed.buyerPhone,
      channel: "OLX_CHAT",
      channelExternalId: parsed.chatId,
      connectionId: connection.id,
      storeId: connection.storeId,
      tenantId: connection.tenantId,
    });
    const lead = await findOrCreateWhatsappLead(transactionPorts, {
      buyerEmail: parsed.buyerEmail,
      buyerName: parsed.buyerName,
      buyerPhone: parsed.buyerPhone || null,
      connectionId: connection.id,
      direction: "INBOUND",
      externalId: parsed.externalMessageId,
      preferredLeadId: session.leadId,
      source: "olx",
      storeId: connection.storeId,
      tenantId: connection.tenantId,
    });
    if (session.leadId !== lead.id) {
      await repository.updateSession({
        leadId: lead.id,
        sessionId: session.id,
        storeId: connection.storeId,
        tenantId: connection.tenantId,
      });
    }
    const persisted = await repository.ingestMessage({
      ...(parsed.buyerName ? { buyerName: parsed.buyerName } : {}),
      buyerPhone: parsed.buyerPhone,
      channel: "OLX_CHAT",
      channelExternalId: parsed.chatId,
      channelMessageId: parsed.externalMessageId,
      connectionId: connection.id,
      content: parsed.message,
      direction: "INBOUND",
      externalId: parsed.externalMessageId,
      firstHandledAt: null,
      freshLeadAt: parsed.timestamp,
      leadId: lead.id,
      metadata: {
        chatId: parsed.chatId,
        listId: parsed.listId,
        provider: "olx_chat",
      },
      providerTimestamp: parsed.timestamp,
      senderOrigin: parsed.senderType === "system" ? "system" : "customer",
      senderType: parsed.senderType === "system" ? "SYSTEM" : "CUSTOMER",
      status: "DELIVERED",
      storeId: connection.storeId,
      tenantId: connection.tenantId,
      type: "TEXT",
    });
    if (persisted.createdMessage) {
      await createWhatsappMessageActivity(transactionPorts, {
        connectionId: connection.id,
        content: parsed.message,
        direction: "inbound",
        leadId: lead.id,
        messageExternalId: parsed.externalMessageId,
        occurredAt: parsed.timestamp,
        provider: "olx_chat",
        sessionId: persisted.session.id,
        storeId: connection.storeId,
        tenantId: connection.tenantId,
      });
    }
    await stageOlxWebhookEffects(transactionPorts, {
      connection,
      message: persisted.message,
      providerEventId: input.providerEventId,
      session: persisted.session,
    });
    return persisted;
  });
}
