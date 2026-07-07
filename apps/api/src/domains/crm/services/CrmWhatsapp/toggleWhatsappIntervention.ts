import { assertPermission } from "../../../../shared/authorization.js";
import type { ServiceContext } from "../../../../shared/serviceContext.js";
import type { CrmWhatsappSessionStatus } from "../../ports/crmWhatsappRepository.js";
import type { WhatsappSession } from "../../whatsapp/whatsappModels.js";
import {
  interventionReason,
  interventionWindow,
  notifyScopedInterventionChangedToBot,
} from "../../whatsapp/whatsappInterventionNotification.js";
import { WhatsappSessionNotFoundError } from "../../whatsapp/whatsappSendErrors.js";
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
  sessionId: string;
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
      metadata: { enabled: input.enabled },
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
  const status: CrmWhatsappSessionStatus = input.enabled
    ? "HUMAN_TAKEOVER"
    : "MINIBOT_ACTIVE";
  const intervention = interventionWindow({
    enabled: input.enabled,
    now,
    previousStartedAt: session.humanTakeoverAt,
  });
  const reason = interventionReason(context);
  const updated = await getCrmWhatsappRepository(ports).updateSession({
    ...(input.enabled ? { firstHandledAt: session.firstHandledAt ?? now } : {}),
    humanTakeoverAt: input.enabled ? now : null,
    metadata: {
      ...session.metadata,
      lastInterventionToggle: {
        actorId: context.actor.id,
        endedAt: intervention.endedAt?.toISOString() ?? null,
        enabled: input.enabled,
        reason,
        startedAt: intervention.startedAt?.toISOString() ?? null,
        toggledAt: now.toISOString(),
      },
    },
    sessionId: input.sessionId,
    status,
    storeId: scope.storeId as never,
    tenantId: scope.tenantId as never,
  });
  if (!updated) throw new WhatsappSessionNotFoundError(input.sessionId);

  const realtimeSession = await sessionWithConnection(
    updated,
    ports,
    input.sessionId,
  );
  await publishWhatsappSessionUpdate(ports, realtimeSession, scope);
  await notifyScopedInterventionChangedToBot(
    context,
    { active: input.enabled, reason, session: updated, window: intervention },
    ports,
  );
  return realtimeSession;
}
