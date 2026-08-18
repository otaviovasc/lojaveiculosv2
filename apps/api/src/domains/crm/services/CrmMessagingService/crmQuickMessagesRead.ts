import { assertPermission } from "../../../../shared/authorization.js";
import type { ServiceContext } from "../../../../shared/serviceContext.js";
import {
  getCrmConversationRepository,
  requireCrmMessagingScope,
  type CrmServicePorts,
} from "../CrmService/serviceSupport.js";
import { auditCrmServiceEvent, logCrmServiceEvent } from "./serviceSupport.js";
import {
  toCrmQuickMessage,
  type CrmQuickMessage,
} from "./crmQuickMessageModels.js";
import { mergeSystemQuickMessages } from "./crmQuickMessageServiceSupport.js";

const readPermission = "crm.conversations.read";

export async function listCrmQuickMessages(
  context: ServiceContext,
  ports: CrmServicePorts,
): Promise<readonly CrmQuickMessage[]> {
  assertPermission(context, readPermission);
  const scope = requireCrmMessagingScope(context);
  const repository = getCrmConversationRepository(ports);
  const persisted = await repository.listQuickMessages({
    storeId: scope.storeId as never,
    tenantId: scope.tenantId as never,
  });
  const messages = mergeSystemQuickMessages(persisted.map(toCrmQuickMessage));
  logCrmServiceEvent(context, "crm.quick_messages.list", {
    count: messages.length,
  });
  await auditCrmServiceEvent(context, {
    action: "crm.quick_messages.list",
    category: "data_access",
    metadata: { count: messages.length },
    permission: readPermission,
    summary: "Listed CRM WhatsApp quick messages",
  });
  return messages;
}
