import type { ServiceContext } from "../../../../shared/serviceContext.js";
import { findBotActionSession } from "../../whatsapp/whatsappBotActionSupport.js";
import { requireBotActionSessionId } from "../../whatsapp/whatsappBotActionSupport.js";
import type { CrmServicePorts } from "../CrmService/serviceSupport.js";
import { closeWhatsappSession } from "./closeWhatsappSession.js";
import { sessionCommandIdFromKey } from "./executeWhatsappSessionCommand.js";
import type { ExecuteWhatsappBotActionInput } from "./whatsappBotActions.js";

export async function executeBotCloseSessionAction(
  context: ServiceContext,
  input: ExecuteWhatsappBotActionInput,
  ports: CrmServicePorts,
) {
  const sessionId = requireBotActionSessionId(input);
  const session = await findBotActionSession(context, sessionId, ports);
  return closeWhatsappSession(
    context,
    {
      commandId: sessionCommandIdFromKey(
        input.idempotencyKey ?? `${context.requestId}:close:${session.id}`,
      ),
      sessionId,
    },
    ports,
  );
}
