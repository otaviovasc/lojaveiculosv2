import { randomUUID } from "node:crypto";
import type {
  CanonicalInboundMessageInput,
  CanonicalInboundMessageResult,
} from "../../../../domains/crm/ports/crmCanonicalInboundRepository.js";
import type {
  CrmWhatsappChannel,
  CrmWhatsappMessageType,
  CrmWhatsappRepository,
  CrmWhatsappSession,
} from "../../../../domains/crm/ports/crmWhatsappRepository.js";

type MemoryCanonicalIdentity = {
  contactId: string;
  identityId: string;
};

export async function ingestProjectedCanonicalInbound(
  repository: CrmWhatsappRepository,
  identities: Map<string, MemoryCanonicalIdentity>,
  input: CanonicalInboundMessageInput,
): Promise<CanonicalInboundMessageResult> {
  const identityKey = scopedCanonicalIdentityKey(input);
  const identity = identities.get(identityKey) ?? {
    contactId: randomUUID(),
    identityId: randomUUID(),
  };
  identities.set(identityKey, identity);
  const existingSession = await findProjectedSession(repository, input);
  const buyerPhone = existingSession?.buyerPhone || preferredMemoryPhone(input);
  const result = await repository.ingestMessage({
    ...((existingSession?.buyerChatLid ?? input.customerChatId)
      ? { buyerChatLid: existingSession?.buyerChatLid ?? input.customerChatId! }
      : {}),
    ...(input.contactDisplayName
      ? { buyerName: input.contactDisplayName }
      : {}),
    buyerPhone,
    channel: toMemoryChannel(input.channel),
    channelExternalId:
      existingSession?.channelExternalId ?? input.externalThreadId,
    connectionId: input.connectionId,
    content: input.content,
    direction: "INBOUND",
    externalId: input.providerMessageId,
    ...(input.mediaType ? { mediaType: input.mediaType } : {}),
    ...(input.mediaUrl ? { mediaUrl: input.mediaUrl } : {}),
    metadata: { ...input.metadata },
    providerTimestamp: input.occurredAt,
    ...(input.profilePhotoStorageKey
      ? { profilePhotoStorageKey: input.profilePhotoStorageKey }
      : {}),
    ...(input.profilePhotoUrl
      ? { profilePhotoUrl: input.profilePhotoUrl }
      : {}),
    senderOrigin: input.senderOrigin,
    senderType: input.sender === "customer" ? "CUSTOMER" : "SYSTEM",
    ...(input.leadId ? { leadId: input.leadId } : {}),
    status: "DELIVERED",
    storeId: input.storeId as never,
    tenantId: input.tenantId as never,
    type: toMemoryMessageType(input.messageType),
  });
  return {
    attendanceState:
      result.session.humanAttendanceState === "IN_HUMAN_SERVICE"
        ? "human_active"
        : result.session.humanAttendanceState === "WAITING_HUMAN"
          ? "handoff_requested"
          : "bot_active",
    contactId: identity.contactId,
    created: result.createdMessage,
    createdSession: result.createdSession,
    cycleId: result.session.id,
    identityId: identity.identityId,
    messageId: result.message.id,
    threadId: result.session.id,
  };
}

export function scopedCanonicalIdentityKey(
  input: CanonicalInboundMessageInput,
): string {
  return [
    input.tenantId,
    input.storeId,
    input.channel,
    input.provider,
    input.identity.kind,
    input.identity.normalizedValue,
  ].join(":");
}

async function findProjectedSession(
  repository: CrmWhatsappRepository,
  input: CanonicalInboundMessageInput,
): Promise<CrmWhatsappSession | null> {
  const sessions = await repository.listSessions({
    connectionId: input.connectionId,
    limit: 100,
    offset: 0,
    storeId: input.storeId as never,
    tenantId: input.tenantId as never,
  });
  const externalIds = new Set([
    input.externalThreadId,
    ...input.externalThreadAliases,
  ]);
  const phoneDigits = new Set(
    [...externalIds, input.secondaryPhone ?? "", input.identity.normalizedValue]
      .map((value) => value.replace(/^phone:/u, "").replace(/\D/gu, ""))
      .filter(Boolean),
  );
  const matches = sessions.filter(
    (session) =>
      (session.channelExternalId &&
        externalIds.has(session.channelExternalId)) ||
      (session.buyerChatLid && externalIds.has(session.buyerChatLid)) ||
      phoneDigits.has(session.buyerPhone.replace(/\D/gu, "")),
  );
  if (matches.length > 1) {
    throw new Error("Canonical CRM memory thread identity is ambiguous.");
  }
  return matches[0] ?? null;
}

function preferredMemoryPhone(input: CanonicalInboundMessageInput) {
  const rawAlias = input.externalThreadAliases.find(
    (value) => !value.includes("@") && /^\+?\d+$/u.test(value),
  );
  const value =
    rawAlias ??
    input.secondaryPhone ??
    (input.identity.kind === "phone" ? input.identity.normalizedValue : "");
  return value.replace(/^\+/u, "");
}

function toMemoryChannel(
  channel: CanonicalInboundMessageInput["channel"],
): CrmWhatsappChannel {
  if (channel === "instagram") return "INSTAGRAM";
  if (channel === "olx_chat") return "OLX_CHAT";
  return "WHATSAPP";
}

function toMemoryMessageType(messageType: string): CrmWhatsappMessageType {
  const normalized = messageType.toUpperCase();
  const supported = new Set<CrmWhatsappMessageType>([
    "AUDIO",
    "CONTACT",
    "DOCUMENT",
    "IMAGE",
    "LOCATION",
    "STICKER",
    "TEXT",
    "VIDEO",
  ]);
  return supported.has(normalized as CrmWhatsappMessageType)
    ? (normalized as CrmWhatsappMessageType)
    : "TEXT";
}
