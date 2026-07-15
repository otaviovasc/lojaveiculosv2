import { assertPermission } from "../../../../shared/authorization.js";
import type { ServiceContext } from "../../../../shared/serviceContext.js";
import {
  getCrmWhatsappRepository,
  requireCrmWhatsappScope,
  type CrmServicePorts,
} from "../CrmService/serviceSupport.js";
import type { WhatsappMessage } from "../../whatsapp/whatsappModels.js";
import { toWhatsappMessage } from "../../whatsapp/whatsappModels.js";
import {
  auditWhatsappServiceEvent,
  logWhatsappServiceEvent,
} from "./serviceSupport.js";

const permission = "crm.whatsapp.read";

export type ListWhatsappMessagesInput = {
  limit: number;
  offset: number;
  sessionId: string;
};

export async function listWhatsappMessages(
  context: ServiceContext,
  input: ListWhatsappMessagesInput,
  ports: CrmServicePorts,
): Promise<readonly WhatsappMessage[]> {
  assertPermission(context, permission);
  const scope = requireCrmWhatsappScope(context);
  logWhatsappServiceEvent(context, "crm.whatsapp.messages.list.started", {
    sessionId: input.sessionId,
  });
  const messages = await getCrmWhatsappRepository(ports).listMessages({
    ...input,
    storeId: scope.storeId as never,
    tenantId: scope.tenantId as never,
  });
  await auditWhatsappServiceEvent(context, {
    action: "crm.whatsapp.messages.list",
    category: "data_access",
    entityId: input.sessionId,
    entityType: "crm_whatsapp_session",
    metadata: { messageCount: messages.length },
    permission,
    summary: "Listed CRM WhatsApp messages",
  });
  return messages.map(toWhatsappMessage);
}
