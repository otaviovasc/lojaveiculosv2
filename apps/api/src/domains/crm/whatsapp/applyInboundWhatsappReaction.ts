import type { ServiceContext } from "../../../shared/serviceContext.js";
import type { CrmConnection } from "../ports/crmConnectionRepository.js";
import type {
  CrmConversationCycle,
  CrmMessage,
} from "../ports/crmConversationRepository.js";
import {
  getCrmConversationRepository,
  getCrmRealtimePublisher,
  type CrmServicePorts,
} from "../services/CrmService/serviceSupport.js";
import { recordCrmServiceMutation } from "../services/CrmMessagingService/serviceSupport.js";
import type { ParsedZapiInboundMessage } from "./parseZapiInboundMessage.js";
import { cleanRecord, readRecord, readString } from "./zapiPayloadRead.js";

export type InboundWhatsappReaction = {
  messageId: string;
  value: string;
};

export type AppliedInboundWhatsappReaction = {
  conversationCycle: CrmConversationCycle;
  message: CrmMessage;
  status: "stored";
};

export function readInboundWhatsappReaction(
  metadata: Record<string, unknown>,
): InboundWhatsappReaction | null {
  const interactive = readRecord(metadata.interactive);
  if (readString(interactive.kind) !== "reaction") return null;
  const messageId = readString(interactive.messageId);
  if (!messageId) return null;
  return { messageId, value: readString(interactive.value) ?? "" };
}

/**
 * Stamps a targeted reaction whose reacted message is not synced yet so the
 * standalone fallback row is distinguishable from legacy standalone reaction
 * rows (which stay hidden in the frontend). No-op for non-reaction messages.
 */
export function markUnresolvedInboundReaction(
  metadata: Record<string, unknown>,
): void {
  if (!readInboundWhatsappReaction(metadata)) return;
  metadata.interactive = {
    ...readRecord(metadata.interactive),
    unresolved: true,
  };
}

/**
 * Attaches an inbound provider reaction to the reacted message instead of
 * persisting it as a standalone bubble. Returns null when the parsed message
 * is not a targeted reaction or the reacted message is not synced yet, so
 * callers fall back to the regular persistence flow (nothing is dropped).
 *
 * metadata.reaction is a single slot shared with outbound reactions
 * (sendCrmReaction). The most recent provider event wins: an existing reaction
 * with a newer sentAt/receivedAt is preserved, otherwise the inbound reaction
 * replaces it. An empty value is the WhatsApp un-react and removes the pill,
 * subject to the same recency guard.
 */
export async function applyInboundWhatsappReactionIfTargeted(
  context: ServiceContext,
  input: {
    connection: CrmConnection;
    parsed: ParsedZapiInboundMessage;
    provider: "uazapi" | "zapi";
  },
  ports: CrmServicePorts,
): Promise<AppliedInboundWhatsappReaction | null> {
  const reaction = readInboundWhatsappReaction(input.parsed.metadata);
  if (!reaction) return null;
  const { connection, parsed, provider } = input;
  const applied = await recordCrmServiceMutation(
    context,
    {
      action: `crm.provider.${provider}.message.reaction`,
      category: "data_change",
      entityId: connection.id,
      entityType: "crm_whatsapp_connection",
      metadata: {
        externalId: parsed.externalId,
        targetExternalId: reaction.messageId,
      },
      permission: "crm.messages.ingest",
      storeId: connection.storeId,
      summary: `Applied inbound ${provider} WhatsApp reaction`,
      tenantId: connection.tenantId,
    },
    () =>
      applyInboundWhatsappReaction(
        {
          connection,
          providerTimestamp: parsed.providerTimestamp,
          reaction,
          senderPhone: parsed.phone,
        },
        ports,
      ),
  );
  if (!applied) return null;
  await getCrmRealtimePublisher(ports).publish({
    connectionId: connection.id,
    conversationCycle: applied.conversationCycle,
    message: applied.message,
    storeId: connection.storeId,
    tenantId: connection.tenantId,
    type: "message",
  });
  return { ...applied, status: "stored" };
}

async function applyInboundWhatsappReaction(
  input: {
    connection: CrmConnection;
    providerTimestamp: Date;
    reaction: InboundWhatsappReaction;
    senderPhone?: string | undefined;
  },
  ports: CrmServicePorts,
): Promise<{
  conversationCycle: CrmConversationCycle;
  message: CrmMessage;
} | null> {
  const repository = getCrmConversationRepository(ports);
  const scope = {
    storeId: input.connection.storeId,
    tenantId: input.connection.tenantId,
  };
  const target = await repository.findMessageByExternalId({
    connectionId: input.connection.id,
    externalId: input.reaction.messageId,
    ...scope,
  });
  if (!target) return null;
  const conversationCycle = (
    await repository.listConversationCycles({
      cycleId: target.cycleId,
      includeArchived: true,
      includeDeleted: true,
      limit: 1,
      offset: 0,
      ...scope,
    })
  )[0];
  if (!conversationCycle) return null;

  const receivedAt = input.providerTimestamp.toISOString();
  const metadata = { ...target.metadata };
  const existing = readRecord(metadata.reaction);
  const existingAt =
    readString(existing.receivedAt) ?? readString(existing.sentAt);
  // The most recent provider event wins for both react and un-react.
  if (existingAt && existingAt >= receivedAt) {
    return { conversationCycle, message: target };
  }
  if (!input.reaction.value) {
    delete metadata.reaction;
  } else {
    metadata.reaction = cleanRecord({
      origin: "inbound",
      receivedAt,
      senderPhone: input.senderPhone,
      value: input.reaction.value,
    });
  }
  const updated = await repository.updateMessage({
    messageId: target.id,
    metadata,
    ...scope,
  });
  if (!updated) return null;
  return { conversationCycle, message: updated };
}
