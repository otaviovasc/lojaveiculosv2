import { assertPermission } from "../../../../shared/authorization.js";
import type { ServiceContext } from "../../../../shared/serviceContext.js";
import {
  getCrmWhatsappRepository,
  type CrmServicePorts,
} from "../CrmService/serviceSupport.js";
import type { WhatsappSession } from "../../whatsapp/whatsappModels.js";
import {
  logWhatsappServiceEvent,
  publishWhatsappSessionUpdate,
  recordWhatsappServiceMutation,
} from "./serviceSupport.js";
import {
  findScopedWhatsappSession,
  sessionWithConnection,
} from "./whatsappSessionMutationSupport.js";
import { WhatsappSessionRevisionConflictError } from "../../whatsapp/whatsappSendErrors.js";

export type MarkWhatsappSessionReadInput = {
  expectedRevision: number;
  sessionId: string;
  unread: boolean;
};

const permission = "crm.whatsapp.read";

export async function markWhatsappSessionReadState(
  context: ServiceContext,
  input: MarkWhatsappSessionReadInput,
  ports: CrmServicePorts,
): Promise<WhatsappSession> {
  assertPermission(context, permission);
  const action = input.unread
    ? "crm.whatsapp.session.mark_unread"
    : "crm.whatsapp.session.mark_read";
  logWhatsappServiceEvent(context, `${action}.started`, {
    sessionId: input.sessionId,
  });
  return recordWhatsappServiceMutation(
    context,
    {
      action,
      category: "data_change",
      entityId: input.sessionId,
      entityType: "crm_whatsapp_session",
      permission,
      summary: input.unread
        ? "Marked CRM WhatsApp session unread"
        : "Marked CRM WhatsApp session read",
    },
    () => markWhatsappSessionReadStateUnchecked(context, input, ports),
  );
}

async function markWhatsappSessionReadStateUnchecked(
  context: ServiceContext,
  input: MarkWhatsappSessionReadInput,
  ports: CrmServicePorts,
) {
  const { scope } = await findScopedWhatsappSession(context, input, ports);
  const updated = await getCrmWhatsappRepository(ports).updateSession({
    lastReadAt: input.unread ? null : new Date(),
    expectedRevision: input.expectedRevision,
    sessionId: input.sessionId,
    storeId: scope.storeId as never,
    tenantId: scope.tenantId as never,
  });
  if (!updated) {
    throw new WhatsappSessionRevisionConflictError(input.sessionId);
  }
  const realtimeSession = await sessionWithConnection(
    updated,
    ports,
    input.sessionId,
  );
  await publishWhatsappSessionUpdate(ports, realtimeSession, scope);
  return realtimeSession;
}
