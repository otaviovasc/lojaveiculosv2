import { assertPermission } from "../../../../shared/authorization.js";
import type { ServiceContext } from "../../../../shared/serviceContext.js";
import type {
  CrmScheduledMessage,
  CrmScheduledMessageStatus,
} from "../../ports/crmConversationRepository.js";
import { resolveCrmQueueVisibility } from "../../messaging/crmQueueVisibility.js";
import {
  getCrmConversationRepository,
  requireCrmMessagingScope,
  type CrmServicePorts,
} from "../CrmService/serviceSupport.js";
import {
  findScopedConversationCycle,
  resolveScopedConversationCycle,
} from "./conversationCycleMutationSupport.js";
import { auditCrmServiceEvent, logCrmServiceEvent } from "./serviceSupport.js";

export {
  createCrmScheduledMessage,
  type CreateCrmScheduledMessageInput,
} from "./crmScheduledMessageCreate.js";
export {
  cancelCrmScheduledMessage,
  type CancelCrmScheduledMessageInput,
  updateCrmScheduledMessage,
  type UpdateCrmScheduledMessageInput,
} from "./crmScheduledMessageMutations.js";
export {
  listDueCrmScheduledMessageScopes,
  processDueCrmScheduledMessages,
} from "./crmScheduledMessageProcessor.js";
export type {
  ListDueCrmScheduledMessageScopesInput,
  ProcessDueCrmScheduledMessagesInput,
  ProcessDueCrmScheduledMessagesResult,
} from "./crmScheduledMessageProcessor.js";

const readPermission = "crm.scheduled_messages.read";

export type ListCrmScheduledMessagesInput = {
  connectionId?: string;
  limit?: number;
  cycleId?: string;
  status?: CrmScheduledMessageStatus;
};

export async function listCrmScheduledMessages(
  context: ServiceContext,
  input: ListCrmScheduledMessagesInput,
  ports: CrmServicePorts,
): Promise<readonly CrmScheduledMessage[]> {
  assertPermission(context, readPermission);
  const scope = requireCrmMessagingScope(context);
  logCrmServiceEvent(context, "crm.scheduled_messages.list.started", {
    ...(input.cycleId ? { cycleId: input.cycleId } : {}),
    ...(input.status ? { status: input.status } : {}),
  });
  if (input.cycleId) {
    await findScopedConversationCycle(
      context,
      { cycleId: input.cycleId },
      ports,
    );
  }
  const messages = await getCrmConversationRepository(
    ports,
  ).listScheduledMessages({
    ...(input.connectionId ? { connectionId: input.connectionId } : {}),
    limit: input.limit ?? 50,
    ...(input.cycleId ? { cycleId: input.cycleId } : {}),
    ...(input.status ? { status: input.status } : {}),
    storeId: scope.storeId as never,
    tenantId: scope.tenantId as never,
  });
  let visibleMessages = messages;
  if (resolveCrmQueueVisibility(context).kind !== "global") {
    const visibleSessionIds = new Set<string>();
    await Promise.all(
      [...new Set(messages.map((message) => message.cycleId))].map(
        async (cycleId) => {
          const { conversationCycle } = await resolveScopedConversationCycle(
            context,
            { cycleId },
            ports,
          );
          if (conversationCycle) visibleSessionIds.add(cycleId);
        },
      ),
    );
    visibleMessages = messages.filter((message) =>
      visibleSessionIds.has(message.cycleId),
    );
  }
  await auditCrmServiceEvent(context, {
    action: "crm.scheduled_messages.list",
    category: "data_access",
    entityId: scope.storeId,
    entityType: "store",
    metadata: { resultCount: visibleMessages.length },
    permission: readPermission,
    summary: "Listed CRM WhatsApp scheduled messages",
  });
  return visibleMessages;
}
