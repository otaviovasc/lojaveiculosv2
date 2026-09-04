import type { CrmConversationRepository } from "../ports/crmConversationRepository.js";
import {
  CrmMessageActionError,
  ConversationCycleNotFoundError,
} from "./crmMessagingErrors.js";

export async function assertCrmScheduledConnectionBinding(
  scheduled: { connectionId: string; cycleId: string },
  scope: { storeId: string; tenantId: string },
  repository: Pick<CrmConversationRepository, "listConversationCycles">,
) {
  const [conversationCycle] = await repository.listConversationCycles({
    limit: 1,
    offset: 0,
    cycleId: scheduled.cycleId,
    storeId: scope.storeId as never,
    tenantId: scope.tenantId as never,
  });
  if (!conversationCycle)
    throw new ConversationCycleNotFoundError(scheduled.cycleId);
  if (conversationCycle.channel !== "WHATSAPP") {
    throw new CrmMessageActionError(
      "Scheduled messages are only supported for WhatsApp conversationCycles.",
      409,
    );
  }
  if (conversationCycle.connectionId !== scheduled.connectionId) {
    throw new CrmMessageActionError(
      "Scheduled message connection binding no longer matches its conversationCycle.",
      409,
    );
  }
}
