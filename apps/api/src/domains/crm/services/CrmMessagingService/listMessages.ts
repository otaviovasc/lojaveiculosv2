import { assertPermission } from "../../../../shared/authorization.js";
import type { ServiceContext } from "../../../../shared/serviceContext.js";
import {
  getCrmConversationRepository,
  type CrmServicePorts,
} from "../CrmService/serviceSupport.js";
import type { CrmMessage } from "../../ports/crmConversationRepository.js";
import { auditCrmServiceEvent, logCrmServiceEvent } from "./serviceSupport.js";
import { findScopedConversationCycle } from "./conversationCycleMutationSupport.js";

const permission = "crm.conversations.read";

export type ListMessagesInput = {
  limit: number;
  offset: number;
  cycleId: string;
};

export async function listMessages(
  context: ServiceContext,
  input: ListMessagesInput,
  ports: CrmServicePorts,
): Promise<readonly CrmMessage[]> {
  assertPermission(context, permission);
  const { scope } = await findScopedConversationCycle(context, input, ports);
  logCrmServiceEvent(context, "crm.messages.list.started", {
    cycleId: input.cycleId,
  });
  const messages = await getCrmConversationRepository(ports).listMessages({
    ...input,
    storeId: scope.storeId as never,
    tenantId: scope.tenantId as never,
  });
  await auditCrmServiceEvent(context, {
    action: "crm.messages.list",
    category: "data_access",
    entityId: input.cycleId,
    entityType: "crm_conversation_cycle",
    metadata: { messageCount: messages.length },
    permission,
    summary: "Listed CRM messages",
  });
  return messages;
}
