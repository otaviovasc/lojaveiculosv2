import { assertPermission } from "../../../../shared/authorization.js";
import type { ServiceContext } from "../../../../shared/serviceContext.js";
import {
  getCrmWhatsappRepository,
  requireCrmWhatsappScope,
  type CrmServicePorts,
} from "../CrmService/serviceSupport.js";
import {
  auditWhatsappServiceEvent,
  logWhatsappServiceEvent,
} from "./serviceSupport.js";
import {
  toWhatsappQuickMessage,
  type WhatsappQuickMessage,
} from "./whatsappQuickMessageModels.js";
import { mergeSystemQuickMessages } from "./whatsappQuickMessageServiceSupport.js";

const readPermission = "crm.whatsapp.read";

export async function listWhatsappQuickMessages(
  context: ServiceContext,
  ports: CrmServicePorts,
): Promise<readonly WhatsappQuickMessage[]> {
  assertPermission(context, readPermission);
  const scope = requireCrmWhatsappScope(context);
  const repository = getCrmWhatsappRepository(ports);
  const persisted = await repository.listQuickMessages({
    storeId: scope.storeId as never,
    tenantId: scope.tenantId as never,
  });
  const messages = mergeSystemQuickMessages(
    persisted.map(toWhatsappQuickMessage),
  );
  logWhatsappServiceEvent(context, "crm.whatsapp.quick_messages.list", {
    count: messages.length,
  });
  await auditWhatsappServiceEvent(context, {
    action: "crm.whatsapp.quick_messages.list",
    category: "data_access",
    metadata: { count: messages.length },
    permission: readPermission,
    summary: "Listed CRM WhatsApp quick messages",
  });
  return messages;
}
