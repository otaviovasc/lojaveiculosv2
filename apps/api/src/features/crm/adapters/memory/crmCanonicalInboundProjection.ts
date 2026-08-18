import { randomUUID } from "node:crypto";
import type {
  CanonicalInboundMessageInput,
  CanonicalInboundMessageResult,
} from "../../../../domains/crm/ports/crmCanonicalInboundRepository.js";
import type {
  CrmMessagingChannel,
  CrmMessageType,
  CrmConversationRepository,
  CrmConversationCycle,
} from "../../../../domains/crm/ports/crmConversationRepository.js";

type MemoryCanonicalIdentity = {
  contactId: string;
  identityId: string;
};

export async function ingestProjectedCanonicalInbound(
  repository: CrmConversationRepository,
  identities: Map<string, MemoryCanonicalIdentity>,
  input: CanonicalInboundMessageInput,
): Promise<CanonicalInboundMessageResult> {
  const identityKey = scopedCanonicalIdentityKey(input);
  const identity = identities.get(identityKey) ?? {
    contactId: randomUUID(),
    identityId: randomUUID(),
  };
  identities.set(identityKey, identity);
  const existingCycle = await findProjectedCycle(repository, input);
  const customerPhone =
    existingCycle?.customerPhone || preferredMemoryPhone(input);
  const result = await repository.ingestMessage({
    ...((existingCycle?.customerChatId ?? input.customerChatId)
      ? {
          customerChatId:
            existingCycle?.customerChatId ?? input.customerChatId!,
        }
      : {}),
    ...(input.contactDisplayName
      ? { customerDisplayName: input.contactDisplayName }
      : {}),
    customerPhone,
    channel: toMemoryChannel(input.channel),
    externalThreadId: existingCycle?.externalThreadId ?? input.externalThreadId,
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
      result.conversationCycle.humanAttendanceState === "IN_HUMAN_SERVICE"
        ? "human_active"
        : result.conversationCycle.humanAttendanceState === "WAITING_HUMAN"
          ? "handoff_requested"
          : "bot_active",
    contactId: identity.contactId,
    created: result.createdMessage,
    createdConversationCycle: result.createdConversationCycle,
    cycleId: result.conversationCycle.id,
    identityId: identity.identityId,
    messageId: result.message.id,
    threadId: result.conversationCycle.id,
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

async function findProjectedCycle(
  repository: CrmConversationRepository,
  input: CanonicalInboundMessageInput,
): Promise<CrmConversationCycle | null> {
  const cycles = await repository.listConversationCycles({
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
  const matches = cycles.filter(
    (cycle) =>
      (cycle.externalThreadId && externalIds.has(cycle.externalThreadId)) ||
      (cycle.customerChatId && externalIds.has(cycle.customerChatId)) ||
      phoneDigits.has(cycle.customerPhone.replace(/\D/gu, "")),
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
): CrmMessagingChannel {
  if (channel === "instagram") return "INSTAGRAM";
  if (channel === "olx_chat") return "OLX_CHAT";
  return "WHATSAPP";
}

function toMemoryMessageType(messageType: string): CrmMessageType {
  const normalized = messageType.toUpperCase();
  const supported = new Set<CrmMessageType>([
    "AUDIO",
    "CONTACT",
    "DOCUMENT",
    "IMAGE",
    "LOCATION",
    "STICKER",
    "TEXT",
    "VIDEO",
  ]);
  return supported.has(normalized as CrmMessageType)
    ? (normalized as CrmMessageType)
    : "TEXT";
}
