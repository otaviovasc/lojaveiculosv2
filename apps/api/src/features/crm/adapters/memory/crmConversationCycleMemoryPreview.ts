import type {
  CrmConversationCycle,
  IngestCrmMessageInput,
} from "../../../../domains/crm/ports/crmConversationRepository.js";
import { shouldBackfillCrmMessagingPhone } from "../../../../domains/crm/messaging/contactIdentity.js";

export function updateMemoryCyclePreview(
  cycle: CrmConversationCycle,
  input: IngestCrmMessageInput,
) {
  const matchedByChatLid = Boolean(
    input.customerChatId && cycle.customerChatId === input.customerChatId,
  );
  if (
    shouldBackfillCrmMessagingPhone(
      cycle.customerPhone,
      input.customerPhone,
      matchedByChatLid,
    )
  ) {
    cycle.customerPhone = input.customerPhone;
  }
  cycle.customerChatId = cycle.customerChatId ?? input.customerChatId ?? null;
  cycle.customerDisplayName =
    cycle.customerDisplayName ?? input.customerDisplayName ?? null;
  cycle.externalThreadId =
    cycle.externalThreadId ?? input.externalThreadId ?? null;
  if (input.direction === "INBOUND") {
    cycle.freshLeadAt =
      cycle.freshLeadAt ?? input.freshLeadAt ?? input.providerTimestamp;
    if (cycle.status !== "HUMAN_TAKEOVER") {
      cycle.humanAttendanceState = null;
      cycle.humanHandlingStartedAt = null;
      cycle.humanTakeoverAt = null;
      cycle.interventionId = null;
      cycle.status = "ACTIVE";
    }
  } else if (input.firstHandledAt) {
    cycle.firstHandledAt = cycle.firstHandledAt ?? input.firstHandledAt;
  }
  cycle.leadId = cycle.leadId ?? input.leadId ?? null;
  if (
    !cycle.lastMessageAt ||
    input.providerTimestamp.getTime() > cycle.lastMessageAt.getTime()
  ) {
    cycle.lastMessageAt = input.providerTimestamp;
    cycle.lastMessageContent = input.content;
  }
  cycle.messageCount += 1;
  cycle.revision += 1;
  cycle.updatedAt = new Date();
}
