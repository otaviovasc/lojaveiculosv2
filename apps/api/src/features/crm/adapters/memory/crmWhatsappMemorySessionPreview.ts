import type {
  CrmWhatsappSession,
  IngestCrmWhatsappMessageInput,
} from "../../../../domains/crm/ports/crmWhatsappRepository.js";
import { shouldBackfillWhatsappPhone } from "../../../../domains/crm/whatsapp/whatsappContactIdentity.js";

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
  session.channelExternalId =
    session.channelExternalId ?? input.channelExternalId ?? null;
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
