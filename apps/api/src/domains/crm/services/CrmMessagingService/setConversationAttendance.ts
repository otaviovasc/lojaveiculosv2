import { assertPermission } from "../../../../shared/authorization.js";
import type { ServiceContext } from "../../../../shared/serviceContext.js";
import type { CrmConversationCycle } from "../../ports/crmConversationRepository.js";
import {
  interventionWindow,
  enqueueScopedAttendanceExternalBotEvent,
} from "../../messaging/interventionNotification.js";
import {
  interventionActorKind,
  transitionHumanAttendance,
} from "../../messaging/humanAttendanceTransition.js";
import {
  getCrmConversationRepository,
  type CrmServicePorts,
} from "../CrmService/serviceSupport.js";
import {
  logCrmServiceEvent,
  publishConversationCycleUpdate,
  recordCrmServiceMutation,
} from "./serviceSupport.js";
import {
  executeCrmConversationCycleCommand,
  reloadScopedConversationCycle,
  reloadVisibleConversationCycle,
  type ConversationCycleCommandResponse,
} from "./executeCrmConversationCycleCommand.js";

export type SetConversationAttendanceInput = {
  commandId: string;
  enabled: boolean;
  interventionId?: string;
  reason?: string;
  cycleId: string;
  source?: "admin" | "auto" | "bot" | "ai_request" | "seller_whatsapp";
};

const interventionPermission = "crm.attendances.manage";

export async function setConversationAttendance(
  context: ServiceContext,
  input: SetConversationAttendanceInput,
  ports: CrmServicePorts,
): Promise<ConversationCycleCommandResponse> {
  assertPermission(context, interventionPermission);
  logCrmServiceEvent(
    context,
    "crm.conversation_cycle.toggle_intervention.started",
    {
      commandId: input.commandId,
      enabled: input.enabled,
      cycleId: input.cycleId,
    },
  );
  let previous: CrmConversationCycle | null = null;
  const source = attendanceSource(context, input.source);
  const reason =
    input.reason ?? defaultInterventionReason(context, input.enabled);
  const command = await recordCrmServiceMutation(
    context,
    {
      action: "crm.conversation_cycle.toggle_intervention",
      category: "data_change",
      entityId: input.cycleId,
      entityType: "crm_conversation_cycle",
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
      executeCrmConversationCycleCommand({
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
              repository: getCrmConversationRepository(transactionPorts),
              conversationCycle: candidate,
            });
            if (!transition.changed) {
              return {
                result: "already_applied",
                conversationCycle: transition.conversationCycle,
              };
            }
            previous = transition.previous;
            return {
              result: "applied",
              conversationCycle: transition.conversationCycle,
            };
          }
          candidate = await reloadVisibleConversationCycle(
            context,
            transactionPorts,
            input.cycleId,
          );
          return { result: "superseded", conversationCycle: candidate };
        },
        ports,
        cycleId: input.cycleId,
      }),
    (result) => ({ result: result.result }),
  );
  const previousSession = previous as CrmConversationCycle | null;
  if (!command.changed || !previousSession) return command;
  const persistedSession = await reloadScopedConversationCycle(
    ports,
    input.cycleId,
    { storeId: context.storeId!, tenantId: context.tenantId! },
  );
  await publishConversationCycleUpdate(ports, command.conversationCycle, {
    storeId: context.storeId!,
    tenantId: context.tenantId!,
  });
  await enqueueScopedAttendanceExternalBotEvent(
    context,
    {
      active: input.enabled,
      previousSession,
      reason,
      conversationCycle: persistedSession,
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
  requested?: SetConversationAttendanceInput["source"],
): NonNullable<SetConversationAttendanceInput["source"]> {
  if (context.actor.kind === "integration") return requested ?? "bot";
  if (context.actor.kind === "system") return requested ?? "auto";
  return "admin";
}
