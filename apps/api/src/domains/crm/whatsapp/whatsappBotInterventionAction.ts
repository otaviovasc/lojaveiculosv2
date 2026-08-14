import type { ServiceContext } from "../../../shared/serviceContext.js";
import type { CrmServicePorts } from "../services/CrmService/serviceSupport.js";
import type { ExecuteWhatsappBotActionInput } from "../services/CrmWhatsapp/whatsappBotActions.js";
import { WhatsappBotActionError } from "../services/CrmWhatsapp/whatsappBotIntegration.js";
import { toggleWhatsappIntervention } from "../services/CrmWhatsapp/updateWhatsappSession.js";
import { sessionCommandIdFromKey } from "../services/CrmWhatsapp/executeWhatsappSessionCommand.js";
import {
  findBotActionSession,
  readOptionalText,
  readRequiredBoolean,
  readRequiredText,
  requireBotActionSessionId,
} from "./whatsappBotActionSupport.js";

export async function executeBotInterventionAction(
  context: ServiceContext,
  input: ExecuteWhatsappBotActionInput,
  ports: CrmServicePorts,
) {
  const sessionId = requireBotActionSessionId(input);
  await findBotActionSession(context, sessionId, ports);
  return toggleWhatsappIntervention(
    context,
    {
      enabled: readRequiredBoolean(input.payload, "enabled"),
      commandId: sessionCommandIdFromKey(
        input.idempotencyKey ??
          `${context.requestId}:intervention:${sessionId}`,
      ),
      ...(readOptionalText(input.payload, "interventionId")
        ? {
            interventionId: readRequiredText(input.payload, "interventionId"),
          }
        : {}),
      ...(readOptionalText(input.payload, "reason")
        ? { reason: readRequiredText(input.payload, "reason") }
        : {}),
      sessionId,
      source: readInterventionSource(input.payload),
    },
    ports,
  );
}

function readInterventionSource(
  payload: Record<string, unknown> | undefined,
): "ai_request" | "auto" | "bot" {
  const source = readOptionalText(payload, "source") ?? "bot";
  if (source === "ai_request" || source === "auto" || source === "bot") {
    return source;
  }
  throw new WhatsappBotActionError(
    "Payload field source must be bot, auto, or ai_request.",
    "CRM_WHATSAPP_BOT_ACTION_VALIDATION_ERROR",
  );
}
