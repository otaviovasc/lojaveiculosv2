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
import { updateMemorySessionPreview } from "./crmWhatsappMemorySessionPreview.js";
import { memoryProfilePhotoMetadata } from "./crmWhatsappMemoryProfilePhoto.js";
import { reconciledOutboundEchoSender } from "../../../../domains/crm/whatsapp/reconcileWhatsappOutboundEcho.js";

type WhatsappSessionIdentityInput =
  IngestCrmWhatsappMessageInput | UpsertCrmWhatsappSessionContextInput;

export function findMemorySession(
  sessions: readonly CrmWhatsappSession[],
  input: WhatsappSessionIdentityInput,
) {
  const scoped = sessions.filter(
    (session) =>
      session.channel === input.channel &&
      session.connectionId === input.connectionId &&
      session.storeId === input.storeId &&
      session.tenantId === input.tenantId,
  );
  return (
    scoped.find(
      (session) =>
        Boolean(input.channelExternalId) &&
        session.channelExternalId === input.channelExternalId,
    ) ??
    scoped.find(
      (session) =>
        Boolean(input.buyerPhone) && session.buyerPhone === input.buyerPhone,
    ) ??
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
    channelExternalId: input.channelExternalId ?? null,
    channelMetadata: {},
    connectionId: input.connectionId,
    createdAt: now,
    externalSessionId: null,
    firstHandledAt: null,
    freshLeadAt: null,
    humanAttendanceChangedAt: null,
    humanAttendanceState: null,
    humanAttendanceStateVersion: null,
    humanHandlingStartedAt: null,
    humanTakeoverAt: null,
    interventionId: null,
    id: randomUUID(),
    lastAssignedAt: null,
    lastCustomerReadAt: null,
    lastMessageAt: null,
    lastMessageContent: null,
    lastReadAt: null,
    leadId: null,
    messageCount: 0,
    metadata: memoryProfilePhotoMetadata(input),
    profilePhotoUrl: input.profilePhotoUrl ?? null,
    revision: 0,
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
    channelMessageId: input.channelMessageId ?? null,
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
    senderOrigin: input.senderOrigin,
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
    let changed = false;
    if (
      shouldBackfillWhatsappPhone(
        session.buyerPhone,
        input.buyerPhone,
        matchedByChatLid,
      )
    ) {
      session.buyerPhone = input.buyerPhone;
      changed = true;
    }
    if (input.profilePhotoStorageKey) {
      session.metadata = {
        ...session.metadata,
        ...memoryProfilePhotoMetadata(input),
      };
      changed = true;
    }
    if (!session.buyerChatLid && input.buyerChatLid) {
      session.buyerChatLid = input.buyerChatLid;
      changed = true;
    }
    if (!session.buyerName && input.buyerName) {
      session.buyerName = input.buyerName;
      changed = true;
    }
    if (!session.channelExternalId && input.channelExternalId) {
      session.channelExternalId = input.channelExternalId;
      changed = true;
    }
    if (
      input.profilePhotoUrl &&
      session.profilePhotoUrl !== input.profilePhotoUrl
    ) {
      session.profilePhotoUrl = input.profilePhotoUrl;
      changed = true;
    }
    if (changed) {
      session.revision += 1;
      session.updatedAt = new Date();
    }
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
  } else {
    session = upsertMemorySessionContext(input.sessions, input.message);
  }

  const existing = input.messages.find(
    (message) =>
      message.sessionId === session.id &&
      message.externalId === input.message.externalId,
  );
  if (existing) {
    const reconciled = reconciledOutboundEchoSender(existing, input.message);
    if (reconciled) {
      existing.senderOrigin = reconciled.senderOrigin;
      existing.senderType = reconciled.senderType;
      existing.updatedAt = now;
    }
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
