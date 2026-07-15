import { assertPermission } from "../../../../shared/authorization.js";
import type { ServiceContext } from "../../../../shared/serviceContext.js";
import {
  getCrmWhatsappRepository,
  requireCrmWhatsappScope,
  type CrmServicePorts,
} from "../CrmService/serviceSupport.js";
import {
  findBotActionSession,
  readOptionalRecord,
  requireBotActionSessionId,
} from "../../whatsapp/whatsappBotActionSupport.js";
import type { ExecuteWhatsappBotActionInput } from "./whatsappBotActions.js";
import {
  logWhatsappServiceEvent,
  publishWhatsappSessionUpdate,
  recordWhatsappServiceMutation,
} from "./serviceSupport.js";
import { sessionWithConnection } from "./whatsappSessionMutationSupport.js";

export async function updateBotSession(
  context: ServiceContext,
  input: ExecuteWhatsappBotActionInput,
  ports: CrmServicePorts,
) {
  const scope = requireCrmWhatsappScope(context);
  assertPermission(context, "crm.whatsapp.integrations.manage");
  logWhatsappServiceEvent(context, "crm.whatsapp.bot.update_session.started", {
    sessionId: input.sessionId ?? null,
  });
  const session = await findBotActionSession(
    context,
    requireBotActionSessionId(input),
    ports,
  );
  return recordWhatsappServiceMutation(
    context,
    {
      action: "crm.whatsapp.bot.update_session",
      category: "data_change",
      entityId: session.id,
      entityType: "crm_whatsapp_session",
      permission: "crm.whatsapp.integrations.manage",
      summary: "Updated CRM WhatsApp session from bot action",
    },
    async () => {
      const updated = await getCrmWhatsappRepository(ports).updateSession({
        ...(input.leadId ? { leadId: input.leadId } : {}),
        metadata: {
          ...session.metadata,
          bot: readOptionalRecord(input.payload, "metadata"),
        },
        sessionId: session.id,
        storeId: scope.storeId as never,
        tenantId: scope.tenantId as never,
      });
      const realtimeSession = await sessionWithConnection(
        updated,
        ports,
        session.id,
      );
      await publishWhatsappSessionUpdate(ports, realtimeSession, scope);
      return realtimeSession;
    },
  );
}
