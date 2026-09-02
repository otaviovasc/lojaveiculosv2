import type {
  CrmMessage,
  CrmMessageStatus,
} from "../../ports/crmConversationRepository.js";
import type { getCrmConversationRepository } from "../CrmService/serviceSupport.js";
import { updateConversationCycleWithCas } from "../../messaging/updateConversationCycleWithCas.js";

export async function updateReadSessionState(
  repository: ReturnType<typeof getCrmConversationRepository>,
  message: CrmMessage,
  status: CrmMessageStatus,
) {
  if (status !== "READ") {
    const [conversationCycle] = await repository.listConversationCycles({
      limit: 1,
      offset: 0,
      cycleId: message.cycleId,
      storeId: message.storeId,
      tenantId: message.tenantId,
    });
    return {
      assignedUserId: conversationCycle?.assignedUserId ?? null,
      lastCustomerReadAt: null,
    };
  }
  const lastCustomerReadAt = new Date();
  const conversationCycle = await updateConversationCycleWithCas(repository, {
    cycleId: message.cycleId,
    storeId: message.storeId,
    tenantId: message.tenantId,
    update: (conversationCycle) => ({
      lastCustomerReadAt:
        conversationCycle.lastCustomerReadAt &&
        conversationCycle.lastCustomerReadAt > lastCustomerReadAt
          ? conversationCycle.lastCustomerReadAt
          : lastCustomerReadAt,
    }),
  });
  return {
    assignedUserId: conversationCycle.assignedUserId,
    lastCustomerReadAt: lastCustomerReadAt.toISOString(),
  };
}
