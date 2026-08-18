import { assertPermission } from "../../../../shared/authorization.js";
import type { ServiceContext } from "../../../../shared/serviceContext.js";
import type { CrmWhatsappSession } from "../../ports/crmWhatsappRepository.js";
import {
  humanAttendanceReason,
  humanAttendanceSource,
  humanAttendanceUpdate,
  interventionActorKind,
} from "../../whatsapp/humanAttendanceTransition.js";
import { persistHumanAttendanceTransition } from "../../whatsapp/persistHumanAttendanceTransition.js";
import { closeLinkedWhatsappLead } from "../../whatsapp/updateWhatsappLinkedLead.js";
import { notifyScopedInterventionChangedToBot } from "../../whatsapp/whatsappInterventionNotification.js";
import {
  getCrmWhatsappRepository,
  type CrmServicePorts,
} from "../CrmService/serviceSupport.js";
import {
  executeWhatsappSessionCommand,
  reloadScopedWhatsappSession,
  reloadVisibleWhatsappSession,
  type WhatsappSessionCommandResponse,
} from "./executeWhatsappSessionCommand.js";
import {
  logWhatsappServiceEvent,
  publishWhatsappSessionUpdate,
  recordWhatsappServiceMutation,
} from "./serviceSupport.js";

export type CloseWhatsappSessionInput = {
  commandId: string;
  sessionId: string;
};

export async function closeWhatsappSession(
  context: ServiceContext,
  input: CloseWhatsappSessionInput,
  ports: CrmServicePorts,
): Promise<WhatsappSessionCommandResponse> {
  assertPermission(context, "crm.whatsapp.close");
  logWhatsappServiceEvent(context, "crm.whatsapp.session.close.started", {
    commandId: input.commandId,
    sessionId: input.sessionId,
  });
  let closedTakeover: CrmWhatsappSession | null = null;
  const command = await recordWhatsappServiceMutation(
    context,
    {
      action: "crm.whatsapp.session.close",
      category: "data_change",
      entityId: input.sessionId,
      entityType: "crm_whatsapp_session",
      metadata: { commandId: input.commandId },
      permission: "crm.whatsapp.close",
      summary: "Closed CRM WhatsApp session",
    },
    () =>
      executeWhatsappSessionCommand({
        commandId: input.commandId,
        commandType: "close",
        context,
        fingerprintInput: { close: true },
        mutate: async (current, transactionPorts, scope) => {
          let candidate = current;
          for (let attempt = 0; attempt < 3; attempt += 1) {
            if (isClosed(candidate)) {
              return { result: "already_applied", session: candidate };
            }
            const updated = await applyClose(
              context,
              candidate,
              transactionPorts,
            );
            if (updated) {
              if (candidate.leadId) {
                await closeLinkedWhatsappLead(
                  context,
                  candidate.leadId,
                  transactionPorts,
                );
              }
              if (candidate.status === "HUMAN_TAKEOVER") {
                closedTakeover = candidate;
              }
              return { result: "applied", session: updated };
            }
            candidate = await reloadVisibleWhatsappSession(
              context,
              transactionPorts,
              input.sessionId,
            );
          }
          return { result: "superseded", session: candidate };
        },
        ports,
        sessionId: input.sessionId,
      }),
    (result) => ({ result: result.result }),
  );
  if (command.changed) {
    await publishWhatsappSessionUpdate(ports, command.session, {
      storeId: context.storeId!,
      tenantId: context.tenantId!,
    });
  }
  if (command.changed && closedTakeover) {
    const persistedSession = await reloadScopedWhatsappSession(
      ports,
      input.sessionId,
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

function isClosed(session: CrmWhatsappSession) {
  return (
    session.status === "COMPLETED" &&
    session.assignedUserId === null &&
    session.humanAttendanceState === null &&
    session.interventionId === null
  );
}

async function applyClose(
  context: ServiceContext,
  session: CrmWhatsappSession,
  ports: CrmServicePorts,
) {
  const now = new Date();
  const update = humanAttendanceUpdate(
    session,
    { kind: "clear", status: "COMPLETED" },
    now,
  );
  if (!update) {
    return getCrmWhatsappRepository(ports).updateSession({
      assignedUserId: null,
      expectedRevision: session.revision,
      sessionId: session.id,
      storeId: session.storeId,
      tenantId: session.tenantId,
    });
  }
  const persisted = await persistHumanAttendanceTransition({
    actorId: context.actor.id,
    actorKind: interventionActorKind(context.actor.kind, "admin"),
    current: session,
    now,
    reason: humanAttendanceReason(session) ?? "session_closed",
    repository: getCrmWhatsappRepository(ports),
    source: humanAttendanceSource(session) ?? "admin",
    update: {
      ...update,
      assignedUserId: null,
      firstHandledAt: session.firstHandledAt ?? now,
      metadata: {
        ...(update.metadata ?? session.metadata),
        lastClosedAt: now.toISOString(),
        lastClosedByActorId: context.actor.id,
      },
    },
  });
  return persisted?.session ?? null;
}

async function notifyClosedIntervention(
  context: ServiceContext,
  previous: CrmWhatsappSession,
  session: CrmWhatsappSession,
  ports: CrmServicePorts,
) {
  const source = humanAttendanceSource(previous);
  await notifyScopedInterventionChangedToBot(
    context,
    {
      active: false,
      previousSession: previous,
      reason: humanAttendanceReason(previous) ?? "session_closed",
      session,
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
