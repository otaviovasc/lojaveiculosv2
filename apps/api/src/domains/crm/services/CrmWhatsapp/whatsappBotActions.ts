import type { ServiceContext } from "../../../../shared/serviceContext.js";
import { assertPermission } from "../../../../shared/authorization.js";
import { createLeadActivity } from "../CrmService/createLeadActivity.js";
import { changeLeadVisitStatus } from "../CrmService/changeLeadVisitStatus.js";
import { createLeadVisit } from "../CrmService/createLeadVisit.js";
import { type CrmServicePorts } from "../CrmService/serviceSupport.js";
import { listWhatsappConnections } from "./listWhatsappConnections.js";
import { listWhatsappSessions } from "./listWhatsappSessions.js";
import { createWhatsappScheduledMessage } from "./whatsappScheduledMessages.js";
import {
  addWhatsappSessionTag,
  createWhatsappTag,
  removeWhatsappSessionTag,
  listWhatsappTags,
} from "./whatsappSessionTags.js";
import { closeWhatsappSession } from "./updateWhatsappSession.js";
import {
  executeBotSendMediaAction,
  executeBotSendTextAction,
} from "../../whatsapp/whatsappBotSendActions.js";
import {
  WhatsappBotActionError,
  type WhatsappBotActionName,
} from "./whatsappBotIntegration.js";
import {
  readOptionalNumber,
  readOptionalText,
  readRequiredDate,
  readRequiredText,
  requireBotActionSessionId,
  resolveBotActionLeadId,
  resolveBotActionTagName,
} from "../../whatsapp/whatsappBotActionSupport.js";
import {
  auditWhatsappServiceEvent,
  logWhatsappServiceEvent,
} from "./serviceSupport.js";
import { updateBotSession } from "./whatsappBotSessionActions.js";
import {
  assertCredereBotActionAuthorized,
  botActionPermission,
  executeCredereCreateSimulationAction,
  executeCredereGetSimulationAction,
  executeCredereReadinessAction,
  isCredereBotAction,
} from "./whatsappBotCredereActions.js";
import { executeBotInterventionAction } from "../../whatsapp/whatsappBotInterventionAction.js";

export type ExecuteWhatsappBotActionInput = {
  action: WhatsappBotActionName;
  connectionId?: string;
  idempotencyKey?: string;
  leadId?: string;
  payload?: Record<string, unknown>;
  sessionId?: string;
  tagId?: string;
  visitId?: string;
};

export async function executeWhatsappBotAction(
  context: ServiceContext,
  input: ExecuteWhatsappBotActionInput,
  ports: CrmServicePorts,
) {
  assertBotActionAuthorized(context, input.action);
  const auditPermission = botActionPermission(input.action);
  logWhatsappServiceEvent(context, "crm.whatsapp.bot.action.execute.started", {
    action: input.action,
    connectionId: input.connectionId ?? null,
    sessionId: input.sessionId ?? null,
  });
  await auditWhatsappServiceEvent(context, {
    action: "crm.whatsapp.bot.action.execute",
    category: "data_change",
    metadata: {
      action: input.action,
      connectionId: input.connectionId ?? null,
      idempotencyKey: input.idempotencyKey ?? null,
      sessionId: input.sessionId ?? null,
    },
    permission: auditPermission,
    summary: "Executed CRM WhatsApp bot action",
  });
  switch (input.action) {
    case "credere_readiness":
      return executeCredereReadinessAction(context, ports);
    case "credere_create_simulation":
      return executeCredereCreateSimulationAction(context, input, ports);
    case "credere_get_simulation":
      return executeCredereGetSimulationAction(context, input, ports);
    case "send_text":
      return executeBotSendTextAction(context, input, ports);
    case "send_image":
    case "send_audio":
    case "send_document":
      return executeBotSendMediaAction(context, input, ports);
    case "add_note":
      return createLeadActivity(
        context,
        {
          activityType: "note",
          content: readRequiredText(input.payload, "content"),
          leadId: await resolveBotActionLeadId(context, input, ports),
          metadata: { source: "crm_whatsapp_bot" },
        },
        ports,
      );
    case "schedule_message":
      return createWhatsappScheduledMessage(
        context,
        {
          scheduledAt: readRequiredDate(input.payload, "scheduledAt"),
          sessionId: requireBotActionSessionId(input),
          text: readRequiredText(input.payload, "text"),
        },
        ports,
      );
    case "create_tag":
      return createWhatsappTag(
        context,
        {
          ...(input.connectionId ? { connectionId: input.connectionId } : {}),
          ...(readOptionalText(input.payload, "color")
            ? { color: readRequiredText(input.payload, "color") }
            : {}),
          ...(readOptionalText(input.payload, "emoji")
            ? { emoji: readRequiredText(input.payload, "emoji") }
            : {}),
          name: readRequiredText(input.payload, "name"),
        },
        ports,
      );
    case "assign_tag":
      return addWhatsappSessionTag(
        context,
        {
          ...(readOptionalText(input.payload, "color")
            ? { color: readRequiredText(input.payload, "color") }
            : {}),
          ...(readOptionalText(input.payload, "emoji")
            ? { emoji: readRequiredText(input.payload, "emoji") }
            : {}),
          name: await resolveBotActionTagName(context, input, ports),
          sessionId: requireBotActionSessionId(input),
        },
        ports,
      );
    case "remove_tag":
      return removeWhatsappSessionTag(
        context,
        {
          sessionId: requireBotActionSessionId(input),
          tagId: input.tagId ?? readRequiredText(input.payload, "tagId"),
        },
        ports,
      );
    case "set_intervention":
      return executeBotInterventionAction(context, input, ports);
    case "update_session":
      return updateBotSession(context, input, ports);
    case "close_session":
      return closeWhatsappSession(
        context,
        { sessionId: requireBotActionSessionId(input) },
        ports,
      );
    case "get_session":
      return listWhatsappSessions(
        context,
        {
          limit: 1,
          offset: 0,
          sessionId: requireBotActionSessionId(input),
        },
        ports,
      ).then((sessions) => sessions[0] ?? null);
    case "list_tags":
      return listWhatsappTags(
        context,
        {
          ...(input.connectionId ? { connectionId: input.connectionId } : {}),
          limit: readOptionalNumber(input.payload, "limit") ?? 100,
        },
        ports,
      );
    case "set_visita":
      return createLeadVisit(
        context,
        {
          leadId: await resolveBotActionLeadId(context, input, ports),
          ...(readOptionalText(input.payload, "listingId")
            ? {
                listingId: readRequiredText(input.payload, "listingId"),
              }
            : {}),
          notes: readOptionalText(input.payload, "notes") ?? null,
          scheduledAt: readRequiredDate(input.payload, "scheduledAt"),
          ...(input.sessionId ? { sessionId: input.sessionId } : {}),
        },
        ports,
      );
    case "remove_visita":
      return changeLeadVisitStatus(
        context,
        {
          status: "cancelled",
          visitId: input.visitId ?? readRequiredText(input.payload, "visitId"),
        },
        ports,
      );
    case "check_connection":
      return listWhatsappConnections(context, ports).then((connections) =>
        input.connectionId
          ? (connections.find((item) => item.id === input.connectionId) ?? null)
          : connections,
      );
    default:
      throw new WhatsappBotActionError(
        "Bot action is not supported.",
        "CRM_WHATSAPP_BOT_ACTION_UNSUPPORTED",
        422,
      );
  }
}

function assertBotActionAuthorized(
  context: ServiceContext,
  action: WhatsappBotActionName,
) {
  if (isCredereBotAction(action)) {
    assertCredereBotActionAuthorized(context, action);
    return;
  }
  assertPermission(context, "crm.whatsapp.integrations.manage");
}
