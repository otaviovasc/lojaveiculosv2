import type { CrmConnection } from "../ports/crmConnectionRepository.js";
import type {
  CrmWhatsappMessage,
  CrmWhatsappSession,
} from "../ports/crmWhatsappRepository.js";
import type { ParsedOlxChatWebhook } from "./parseOlxChatWebhook.js";
import {
  runCrmTransaction,
  type CrmServicePorts,
} from "../services/CrmService/serviceSupport.js";
import { createWhatsappMessageActivity } from "../whatsapp/createWhatsappMessageActivity.js";
import { findOrCreateWhatsappLead } from "../whatsapp/whatsappLeadLinking.js";
import { stageOlxWebhookEffects } from "./olxWebhookEffectOutbox.js";
import { persistCanonicalInbound } from "./persistCanonicalInbound.js";

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
    const lead = await findOrCreateWhatsappLead(transactionPorts, {
      buyerEmail: parsed.buyerEmail,
      buyerName: parsed.buyerName,
      buyerPhone: parsed.buyerPhone || null,
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
      contactDisplayName: parsed.buyerName ?? null,
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
        provider: "olx_chat",
        senderType: parsed.senderType,
      },
      provider: "olx",
      providerMessageId: parsed.externalMessageId,
      secondaryPhone: parsed.buyerPhone || null,
      sender: parsed.senderType === "system" ? "system" : "customer",
      senderOrigin: parsed.senderType === "system" ? "system" : "customer",
      source: "olx",
      storeId: connection.storeId,
      tenantId: connection.tenantId,
    });
    const persisted = projectOlxCanonicalInbound(
      connection,
      parsed,
      canonical,
      lead.id,
    );
    if (canonical.created) {
      await createWhatsappMessageActivity(transactionPorts, {
        connectionId: connection.id,
        content: parsed.message,
        direction: "inbound",
        leadId: lead.id,
        messageExternalId: parsed.externalMessageId,
        occurredAt: parsed.timestamp,
        provider: "olx_chat",
        sessionId: canonical.cycleId,
        storeId: connection.storeId,
        tenantId: connection.tenantId,
      });
      await stageOlxWebhookEffects(transactionPorts, {
        connection,
        message: persisted.message,
        providerEventId: input.providerEventId,
        session: persisted.session,
      });
    }
    return persisted;
  });
}

function projectOlxCanonicalInbound(
  connection: CrmConnection,
  parsed: ParsedOlxChatWebhook,
  canonical: Awaited<ReturnType<typeof persistCanonicalInbound>>,
  leadId: string,
) {
  const metadata = {
    chatId: parsed.chatId,
    listId: parsed.listId,
    provider: "olx_chat",
    senderType: parsed.senderType,
  };
  const message: CrmWhatsappMessage = {
    channel: "OLX_CHAT",
    channelMessageId: parsed.externalMessageId,
    connectionId: connection.id,
    content: parsed.message,
    createdAt: parsed.timestamp,
    deletedAt: null,
    direction: "INBOUND",
    externalId: parsed.externalMessageId,
    id: canonical.messageId,
    mediaType: null,
    mediaUrl: null,
    metadata,
    providerTimestamp: parsed.timestamp,
    senderOrigin: parsed.senderType === "system" ? "system" : "customer",
    senderType: parsed.senderType === "system" ? "SYSTEM" : "CUSTOMER",
    sessionId: canonical.cycleId,
    status: "DELIVERED",
    storeId: connection.storeId,
    tenantId: connection.tenantId,
    type: "TEXT",
    updatedAt: parsed.timestamp,
  };
  const session: CrmWhatsappSession = {
    assignedUserId: null,
    buyerChatLid: null,
    buyerName: parsed.buyerName,
    buyerPhone: parsed.buyerPhone,
    channel: "OLX_CHAT",
    channelExternalId: parsed.chatId,
    channelMetadata: {},
    connectionId: connection.id,
    createdAt: parsed.timestamp,
    externalSessionId: parsed.chatId,
    firstHandledAt: null,
    freshLeadAt: parsed.timestamp,
    humanAttendanceChangedAt: null,
    humanAttendanceState:
      canonical.attendanceState === "human_active"
        ? "IN_HUMAN_SERVICE"
        : canonical.attendanceState === "bot_active"
          ? null
          : "WAITING_HUMAN",
    humanAttendanceStateVersion:
      canonical.attendanceState === "bot_active" ? null : 0,
    humanHandlingStartedAt: null,
    humanTakeoverAt: null,
    interventionId: null,
    id: canonical.cycleId,
    lastAssignedAt: null,
    lastCustomerReadAt: null,
    lastMessageAt: parsed.timestamp,
    lastMessageContent: parsed.message,
    lastReadAt: null,
    leadId,
    messageCount: 1,
    metadata: { canonicalThreadId: canonical.threadId, ...metadata },
    profilePhotoUrl: null,
    revision: 1,
    sessionTags: [],
    source: "olx",
    status:
      canonical.attendanceState === "bot_active" ? "ACTIVE" : "HUMAN_TAKEOVER",
    storeId: connection.storeId,
    tenantId: connection.tenantId,
    unreadCount: 1,
    updatedAt: parsed.timestamp,
  };
  return {
    createdMessage: canonical.created,
    createdSession: false,
    message,
    session,
  };
}
