import { assertPermission } from "../../../../shared/authorization.js";
import type { ServiceContext } from "../../../../shared/serviceContext.js";
import type { CrmWhatsappSession } from "../../ports/crmWhatsappRepository.js";
import {
  interventionWindow,
  notifyScopedInterventionChangedToBot,
} from "../../whatsapp/whatsappInterventionNotification.js";
import {
  interventionActorKind,
  transitionHumanAttendance,
} from "../../whatsapp/humanAttendanceTransition.js";
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
  executeWhatsappSessionCommand,
  reloadScopedWhatsappSession,
  reloadVisibleWhatsappSession,
  type WhatsappSessionCommandResponse,
} from "./executeWhatsappSessionCommand.js";

export type ToggleWhatsappInterventionInput = {
  commandId: string;
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
): Promise<WhatsappSessionCommandResponse> {
  assertPermission(context, interventionPermission);
  logWhatsappServiceEvent(
    context,
    "crm.whatsapp.session.toggle_intervention.started",
    {
      commandId: input.commandId,
      enabled: input.enabled,
      sessionId: input.sessionId,
    },
  );
  let previous: CrmWhatsappSession | null = null;
  const source = attendanceSource(context, input.source);
  const reason =
    input.reason ?? defaultInterventionReason(context, input.enabled);
  const command = await recordWhatsappServiceMutation(
    context,
    {
      action: "crm.whatsapp.session.toggle_intervention",
      category: "data_change",
      entityId: input.sessionId,
      entityType: "crm_whatsapp_session",
      metadata: {
        commandId: input.commandId,
        enabled: input.enabled,
        interventionId: input.interventionId ?? null,
        reasonPresent: Boolean(input.reason),
        source: input.source ?? null,
      },
      permission: interventionPermission,
      summary: "Toggled CRM WhatsApp human intervention",
    },
    () =>
      executeWhatsappSessionCommand({
        commandId: input.commandId,
        commandType: "intervention",
        context,
        fingerprintInput: {
          enabled: input.enabled,
          interventionId: input.interventionId ?? null,
          reason: input.reason ?? null,
          source: input.source ?? null,
        },
        mutate: async (current, transactionPorts, scope) => {
          let candidate = current;
          for (let attempt = 0; attempt < 3; attempt += 1) {
            const transition = await transitionHumanAttendance({
              actorId: context.actor.id,
              actorKind: interventionActorKind(context.actor.kind, source),
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
              repository: getCrmWhatsappRepository(transactionPorts),
              session: candidate,
            });
            if (!transition.changed) {
              return { result: "already_applied", session: transition.session };
            }
            previous = transition.previous;
            return { result: "applied", session: transition.session };
          }
          candidate = await reloadVisibleWhatsappSession(
            context,
            transactionPorts,
            input.sessionId,
          );
          return { result: "superseded", session: candidate };
        },
        ports,
        sessionId: input.sessionId,
      }),
    (result) => ({ result: result.result }),
  );
  const previousSession = previous as CrmWhatsappSession | null;
  if (!command.changed || !previousSession) return command;
  const persistedSession = await reloadScopedWhatsappSession(
    ports,
    input.sessionId,
    { storeId: context.storeId!, tenantId: context.tenantId! },
  );
  await publishWhatsappSessionUpdate(ports, command.session, {
    storeId: context.storeId!,
    tenantId: context.tenantId!,
  });
  await notifyScopedInterventionChangedToBot(
    context,
    {
      active: input.enabled,
      previousSession,
      reason,
      session: persistedSession,
      source,
      window: interventionWindow({
        enabled: input.enabled,
        now: new Date(),
        previousStartedAt: previousSession.humanTakeoverAt,
      }),
    },
    ports,
  );
  return command;
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
