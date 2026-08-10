import { assertPermission } from "../../../../shared/authorization.js";
import type { ServiceContext } from "../../../../shared/serviceContext.js";
import type { WhatsappSession } from "../../whatsapp/whatsappModels.js";
import {
  interventionWindow,
  notifyScopedInterventionChangedToBot,
} from "../../whatsapp/whatsappInterventionNotification.js";
import { transitionHumanAttendance } from "../../whatsapp/humanAttendanceTransition.js";
import {
  getCrmWhatsappRepository,
  type CrmServicePorts,
} from "../CrmService/serviceSupport.js";
import {
  logWhatsappServiceEvent,
  publishWhatsappSessionUpdate,
  recordWhatsappServiceMutation,
} from "./serviceSupport.js";
import {
  findScopedWhatsappSession,
  sessionWithConnection,
} from "./whatsappSessionMutationSupport.js";

export type ToggleWhatsappInterventionInput = {
  enabled: boolean;
  interventionId?: string;
  reason?: string;
  sessionId: string;
  source?: "admin" | "auto" | "bot" | "ai_request" | "seller_whatsapp";
};

const interventionPermission = "crm.whatsapp.toggle_intervention";

export async function toggleWhatsappIntervention(
  context: ServiceContext,
  input: ToggleWhatsappInterventionInput,
  ports: CrmServicePorts,
): Promise<WhatsappSession> {
  assertPermission(context, interventionPermission);
  logWhatsappServiceEvent(
    context,
    "crm.whatsapp.session.toggle_intervention.started",
    { enabled: input.enabled, sessionId: input.sessionId },
  );
  return recordWhatsappServiceMutation(
    context,
    {
      action: "crm.whatsapp.session.toggle_intervention",
      category: "data_change",
      entityId: input.sessionId,
      entityType: "crm_whatsapp_session",
      metadata: {
        enabled: input.enabled,
        interventionId: input.interventionId ?? null,
        reasonPresent: Boolean(input.reason),
        source: input.source ?? null,
      },
      permission: interventionPermission,
      summary: "Toggled CRM WhatsApp human intervention",
    },
    () => toggleWhatsappInterventionUnchecked(context, input, ports),
  );
}

async function toggleWhatsappInterventionUnchecked(
  context: ServiceContext,
  input: ToggleWhatsappInterventionInput,
  ports: CrmServicePorts,
) {
  const { scope, session } = await findScopedWhatsappSession(
    context,
    input,
    ports,
  );
  const now = new Date();
  const intervention = interventionWindow({
    enabled: input.enabled,
    now,
    previousStartedAt: session.humanTakeoverAt,
  });
  const source = attendanceSource(context, input.source);
  const reason =
    input.reason ?? defaultInterventionReason(context, input.enabled);
  const transition = await transitionHumanAttendance({
    command: input.enabled
      ? {
          ...(input.interventionId
            ? { interventionId: input.interventionId }
            : {}),
          kind: "start",
          reason,
          source,
          state:
            context.actor.kind === "user"
              ? "IN_HUMAN_SERVICE"
              : "WAITING_HUMAN",
        }
      : {
          ...(input.interventionId
            ? { interventionId: input.interventionId }
            : {}),
          kind: "clear",
          status: "MINIBOT_ACTIVE",
        },
    now,
    repository: getCrmWhatsappRepository(ports),
    session,
  });
  const updated = transition.session;

  const realtimeSession = await sessionWithConnection(
    updated,
    ports,
    input.sessionId,
  );
  if (!transition.changed) return realtimeSession;
  await publishWhatsappSessionUpdate(ports, realtimeSession, scope);
  await notifyScopedInterventionChangedToBot(
    context,
    {
      active: input.enabled,
      previousSession: transition.previous,
      reason,
      session: updated,
      source,
      window: intervention,
    },
    ports,
  );
  return realtimeSession;
}

function defaultInterventionReason(context: ServiceContext, enabled: boolean) {
  if (context.actor.kind === "integration") {
    return enabled ? "KEYWORD_TRIGGER" : "bot_action";
  }
  if (context.actor.kind === "system") return "system_toggle";
  return "manual_toggle";
}

function attendanceSource(
  context: ServiceContext,
  requested?: ToggleWhatsappInterventionInput["source"],
): NonNullable<ToggleWhatsappInterventionInput["source"]> {
  if (context.actor.kind === "integration") return requested ?? "bot";
  if (context.actor.kind === "system") return requested ?? "auto";
  return "admin";
}
