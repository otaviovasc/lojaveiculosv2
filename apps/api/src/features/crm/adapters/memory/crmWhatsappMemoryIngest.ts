import { randomUUID } from "node:crypto";
import type {
  CrmWhatsappMessage,
  CrmWhatsappSession,
  IngestCrmWhatsappMessageInput,
} from "../../../../domains/crm/ports/crmWhatsappRepository.js";

export function findMemorySession(
  sessions: readonly CrmWhatsappSession[],
  input: IngestCrmWhatsappMessageInput,
) {
  return sessions.find(
    (session) =>
      session.connectionId === input.connectionId &&
      (session.buyerPhone === input.buyerPhone ||
        Boolean(
          input.buyerChatLid && session.buyerChatLid === input.buyerChatLid,
        )),
  );
}

export function createMemorySession(
  input: IngestCrmWhatsappMessageInput,
  now: Date,
): CrmWhatsappSession {
  return {
    assignedUserId: null,
    buyerChatLid: input.buyerChatLid ?? null,
    buyerName: input.buyerName ?? null,
    buyerPhone: input.buyerPhone,
    channel: input.channel,
    channelExternalId: null,
    channelMetadata: {},
    connectionId: input.connectionId,
    createdAt: now,
    externalSessionId: null,
    firstHandledAt: input.firstHandledAt ?? null,
    freshLeadAt: input.freshLeadAt ?? null,
    humanTakeoverAt: null,
    id: randomUUID(),
    lastAssignedAt: null,
    lastCustomerReadAt: null,
    lastMessageAt: input.providerTimestamp,
    lastMessageContent: input.content,
    lastReadAt: null,
    leadId: input.leadId ?? null,
    messageCount: 0,
    metadata: {},
    profilePhotoUrl: null,
    sessionTags: [],
    source: null,
    status: "ACTIVE",
    storeId: input.storeId,
    tenantId: input.tenantId,
    unreadCount: 0,
    updatedAt: now,
  };
}

export function createMemoryMessage(
  input: IngestCrmWhatsappMessageInput,
  sessionId: string,
  now: Date,
): CrmWhatsappMessage {
  return {
    channel: input.channel,
    channelMessageId: null,
    connectionId: input.connectionId,
    content: input.content,
    createdAt: now,
    deletedAt: null,
    direction: input.direction,
    externalId: input.externalId,
    id: randomUUID(),
    mediaType: input.mediaType ?? null,
    mediaUrl: input.mediaUrl ?? null,
    metadata: input.metadata,
    providerTimestamp: input.providerTimestamp,
    senderType: input.senderType,
    sessionId,
    status: input.status,
    storeId: input.storeId,
    tenantId: input.tenantId,
    type: input.type,
    updatedAt: now,
  };
}

export function updateMemorySessionPreview(
  session: CrmWhatsappSession,
  input: IngestCrmWhatsappMessageInput,
) {
  session.buyerChatLid = session.buyerChatLid ?? input.buyerChatLid ?? null;
  session.buyerName = session.buyerName ?? input.buyerName ?? null;
  if (input.direction === "INBOUND") {
    session.freshLeadAt =
      session.freshLeadAt ?? input.freshLeadAt ?? input.providerTimestamp;
    session.humanTakeoverAt = null;
    session.status = "ACTIVE";
  } else {
    session.firstHandledAt = session.firstHandledAt ?? input.providerTimestamp;
    session.humanTakeoverAt =
      session.humanTakeoverAt ?? input.providerTimestamp;
    session.status = "HUMAN_TAKEOVER";
  }
  session.leadId = session.leadId ?? input.leadId ?? null;
  if (
    !session.lastMessageAt ||
    input.providerTimestamp.getTime() > session.lastMessageAt.getTime()
  ) {
    session.lastMessageAt = input.providerTimestamp;
    session.lastMessageContent = input.content;
  }
  session.messageCount += 1;
  session.updatedAt = new Date();
}
