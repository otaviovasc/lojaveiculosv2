import { assertPermission } from "../../../../shared/authorization.js";
import type { ServiceContext } from "../../../../shared/serviceContext.js";
import type { CrmConversationCycle } from "../../ports/crmConversationRepository.js";
import {
  humanAttendanceReason,
  humanAttendanceSource,
  humanAttendanceUpdate,
  interventionActorKind,
} from "../../messaging/humanAttendanceTransition.js";
import { persistHumanAttendanceTransition } from "../../messaging/persistHumanAttendanceTransition.js";
import { closeLinkedCrmLead } from "../../messaging/updateLinkedLead.js";
import { enqueueScopedAttendanceExternalBotEvent } from "../../messaging/interventionNotification.js";
import {
  getCrmConversationRepository,
  type CrmServicePorts,
} from "../CrmService/serviceSupport.js";
import {
  executeCrmConversationCycleCommand,
  reloadScopedConversationCycle,
  reloadVisibleConversationCycle,
  type ConversationCycleCommandResponse,
} from "./executeCrmConversationCycleCommand.js";
import {
  logCrmServiceEvent,
  publishConversationCycleUpdate,
  recordCrmServiceMutation,
} from "./serviceSupport.js";

export type CloseConversationCycleInput = {
  commandId: string;
  cycleId: string;
};

export async function closeConversationCycle(
  context: ServiceContext,
  input: CloseConversationCycleInput,
  ports: CrmServicePorts,
): Promise<ConversationCycleCommandResponse> {
  assertPermission(context, "crm.conversations.manage");
  logCrmServiceEvent(context, "crm.conversation_cycle.close.started", {
    commandId: input.commandId,
    cycleId: input.cycleId,
  });
  let closedTakeover: CrmConversationCycle | null = null;
  const command = await recordCrmServiceMutation(
    context,
    {
      action: "crm.conversation_cycle.close",
      category: "data_change",
      entityId: input.cycleId,
      entityType: "crm_conversation_cycle",
      metadata: { commandId: input.commandId },
      permission: "crm.conversations.manage",
      summary: "Closed CRM WhatsApp conversationCycle",
    },
    () =>
      executeCrmConversationCycleCommand({
        commandId: input.commandId,
        commandType: "close",
        context,
        fingerprintInput: { close: true },
        mutate: async (current, transactionPorts, scope) => {
          let candidate = current;
          for (let attempt = 0; attempt < 3; attempt += 1) {
            if (isClosed(candidate)) {
              return {
                result: "already_applied",
                conversationCycle: candidate,
              };
            }
            const updated = await applyClose(
              context,
              candidate,
              transactionPorts,
            );
            if (updated) {
              if (candidate.leadId) {
                await closeLinkedCrmLead(
                  context,
                  candidate.leadId,
                  transactionPorts,
                );
              }
              if (candidate.status === "HUMAN_TAKEOVER") {
                closedTakeover = candidate;
              }
              return { result: "applied", conversationCycle: updated };
            }
            candidate = await reloadVisibleConversationCycle(
              context,
              transactionPorts,
              input.cycleId,
            );
          }
          return { result: "superseded", conversationCycle: candidate };
        },
        ports,
        cycleId: input.cycleId,
      }),
    (result) => ({ result: result.result }),
  );
  if (command.changed) {
    await publishConversationCycleUpdate(ports, command.conversationCycle, {
      storeId: context.storeId!,
      tenantId: context.tenantId!,
    });
  }
  if (command.changed && closedTakeover) {
    const persistedSession = await reloadScopedConversationCycle(
      ports,
      input.cycleId,
      { storeId: context.storeId!, tenantId: context.tenantId! },
    );
    await notifyClosedIntervention(
      context,
      closedTakeover,
      persistedSession,
      ports,
    );
  }
  return command;
}

function isClosed(conversationCycle: CrmConversationCycle) {
  return (
    conversationCycle.status === "COMPLETED" &&
    conversationCycle.assignedUserId === null &&
    conversationCycle.humanAttendanceState === null &&
    conversationCycle.interventionId === null
  );
}

async function applyClose(
  context: ServiceContext,
  conversationCycle: CrmConversationCycle,
  ports: CrmServicePorts,
) {
  const now = new Date();
  const update = humanAttendanceUpdate(
    conversationCycle,
    { kind: "clear", status: "COMPLETED" },
    now,
  );
  if (!update) {
    return getCrmConversationRepository(ports).updateConversationCycle({
      assignedUserId: null,
      expectedRevision: conversationCycle.revision,
      cycleId: conversationCycle.id,
      storeId: conversationCycle.storeId,
      tenantId: conversationCycle.tenantId,
    });
  }
  const persisted = await persistHumanAttendanceTransition({
    actorId: context.actor.id,
    actorKind: interventionActorKind(context.actor.kind, "admin"),
    current: conversationCycle,
    now,
    reason: humanAttendanceReason(conversationCycle) ?? "session_closed",
    repository: getCrmConversationRepository(ports),
    source: humanAttendanceSource(conversationCycle) ?? "admin",
    update: {
      ...update,
      assignedUserId: null,
      firstHandledAt: conversationCycle.firstHandledAt ?? now,
      metadata: {
        ...(update.metadata ?? conversationCycle.metadata),
        lastClosedAt: now.toISOString(),
        lastClosedByActorId: context.actor.id,
      },
    },
  });
  return persisted?.conversationCycle ?? null;
}

async function notifyClosedIntervention(
  context: ServiceContext,
  previous: CrmConversationCycle,
  conversationCycle: CrmConversationCycle,
  ports: CrmServicePorts,
) {
  const source = humanAttendanceSource(previous);
  await enqueueScopedAttendanceExternalBotEvent(
    context,
    {
      active: false,
      previousSession: previous,
      reason: humanAttendanceReason(previous) ?? "session_closed",
      conversationCycle,
      source:
        source === "ai_request" ||
        source === "auto" ||
        source === "bot" ||
        source === "seller_whatsapp"
          ? source
          : "admin",
      window: { endedAt: new Date(), startedAt: previous.humanTakeoverAt },
    },
    ports,
  );
}
