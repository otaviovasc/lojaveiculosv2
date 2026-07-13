import { randomUUID } from "node:crypto";
import type {
  CrmWhatsappMessage,
  CrmWhatsappSession,
  IngestCrmWhatsappMessageInput,
  UpsertCrmWhatsappSessionContextInput,
} from "../../../../domains/crm/ports/crmWhatsappRepository.js";
import { shouldBackfillWhatsappPhone } from "../../../../domains/crm/whatsapp/whatsappContactIdentity.js";
import { withUnreadCount } from "./crmWhatsappMemoryQueries.js";
import {
  requireHydratedSession,
  type MemoryWhatsappTagState,
} from "./crmWhatsappMemoryTags.js";

type WhatsappSessionIdentityInput =
  IngestCrmWhatsappMessageInput | UpsertCrmWhatsappSessionContextInput;

export function findMemorySession(
  sessions: readonly CrmWhatsappSession[],
  input: WhatsappSessionIdentityInput,
) {
  const scoped = sessions.filter(
    (session) => session.connectionId === input.connectionId,
  );
  return (
    scoped.find((session) => session.buyerPhone === input.buyerPhone) ??
    scoped.find(
      (session) =>
        Boolean(input.buyerChatLid) &&
        session.buyerChatLid === input.buyerChatLid,
    )
  );
}

export function createMemorySession(
  input: IngestCrmWhatsappMessageInput,
  now: Date,
): CrmWhatsappSession {
  return {
    ...createMemorySessionContext(input, now),
    firstHandledAt: input.firstHandledAt ?? null,
    freshLeadAt: input.freshLeadAt ?? null,
    lastMessageAt: input.providerTimestamp,
    lastMessageContent: input.content,
    leadId: input.leadId ?? null,
  };
}

export function createMemorySessionContext(
  input: UpsertCrmWhatsappSessionContextInput,
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
    firstHandledAt: null,
    freshLeadAt: null,
    humanTakeoverAt: null,
    id: randomUUID(),
    lastAssignedAt: null,
    lastCustomerReadAt: null,
    lastMessageAt: null,
    lastMessageContent: null,
    lastReadAt: null,
    leadId: null,
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

export function upsertMemorySessionContext(
  sessions: CrmWhatsappSession[],
  input: UpsertCrmWhatsappSessionContextInput,
) {
  let session = findMemorySession(sessions, input);
  if (!session) {
    session = createMemorySessionContext(input, new Date());
    sessions.push(session);
  } else {
    const matchedByChatLid = Boolean(
      input.buyerChatLid && session.buyerChatLid === input.buyerChatLid,
    );
    if (
      shouldBackfillWhatsappPhone(
        session.buyerPhone,
        input.buyerPhone,
        matchedByChatLid,
      )
    ) {
      session.buyerPhone = input.buyerPhone;
    }
    session.buyerChatLid = session.buyerChatLid ?? input.buyerChatLid ?? null;
    session.buyerName = session.buyerName ?? input.buyerName ?? null;
    session.updatedAt = new Date();
  }
  return session;
}

export async function ingestMemoryWhatsappMessage(input: {
  message: IngestCrmWhatsappMessageInput;
  messages: CrmWhatsappMessage[];
  sessions: CrmWhatsappSession[];
  tagState: MemoryWhatsappTagState;
}) {
  const now = new Date();
  let createdSession = false;
  let session = findMemorySession(input.sessions, input.message);
  if (!session) {
    createdSession = true;
    session = createMemorySession(input.message, now);
    input.sessions.push(session);
  } else if (
    input.message.direction === "INBOUND" &&
    session.status === "COMPLETED"
  ) {
    session.status = "ACTIVE";
    session.humanTakeoverAt = null;
  }

  const existing = input.messages.find(
    (message) =>
      message.sessionId === session.id &&
      message.externalId === input.message.externalId,
  );
  if (existing) {
    return {
      createdMessage: false,
      createdSession,
      message: existing,
      session: hydrate(session, input.messages, input.tagState),
    };
  }

  const message = createMemoryMessage(input.message, session.id, now);
  input.messages.push(message);
  updateMemorySessionPreview(session, input.message);
  return {
    createdMessage: true,
    createdSession,
    message,
    session: hydrate(session, input.messages, input.tagState),
  };
}

function hydrate(
  session: CrmWhatsappSession,
  messages: CrmWhatsappMessage[],
  tagState: MemoryWhatsappTagState,
) {
  return requireHydratedSession(withUnreadCount(session, messages), tagState);
}

export function updateMemorySessionPreview(
  session: CrmWhatsappSession,
  input: IngestCrmWhatsappMessageInput,
) {
  const matchedByChatLid = Boolean(
    input.buyerChatLid && session.buyerChatLid === input.buyerChatLid,
  );
  if (
    shouldBackfillWhatsappPhone(
      session.buyerPhone,
      input.buyerPhone,
      matchedByChatLid,
    )
  ) {
    session.buyerPhone = input.buyerPhone;
  }
  session.buyerChatLid = session.buyerChatLid ?? input.buyerChatLid ?? null;
  session.buyerName = session.buyerName ?? input.buyerName ?? null;
  if (input.direction === "INBOUND") {
    session.freshLeadAt =
      session.freshLeadAt ?? input.freshLeadAt ?? input.providerTimestamp;
    if (session.status !== "HUMAN_TAKEOVER") {
      session.humanTakeoverAt = null;
      session.status = "ACTIVE";
    }
  } else if (input.senderType === "HUMAN") {
    session.firstHandledAt = session.firstHandledAt ?? input.providerTimestamp;
    session.humanTakeoverAt =
      session.humanTakeoverAt ?? input.providerTimestamp;
    session.status = "HUMAN_TAKEOVER";
  } else {
    session.firstHandledAt = session.firstHandledAt ?? input.providerTimestamp;
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
