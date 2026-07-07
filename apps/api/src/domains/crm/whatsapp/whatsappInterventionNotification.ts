import type { ServiceContext } from "../../../shared/serviceContext.js";
import type { CrmWhatsappSession } from "../ports/crmWhatsappRepository.js";
import {
  getCrmConnectionRepository,
  type CrmServicePorts,
} from "../services/CrmService/serviceSupport.js";
import { notifyWhatsappInterventionChangedToBot } from "./whatsappBotWebhookForwarding.js";

export type WhatsappInterventionWindow = {
  endedAt: Date | null;
  startedAt: Date | null;
};

export function interventionReason(context: ServiceContext) {
  if (context.actor.kind === "integration") return "bot_action";
  if (context.actor.kind === "system") return "system_toggle";
  return "manual_toggle";
}

export function interventionWindow(input: {
  enabled: boolean;
  now: Date;
  previousStartedAt: Date | null;
}): WhatsappInterventionWindow {
  return {
    endedAt: input.enabled ? null : input.now,
    startedAt: input.enabled ? input.now : input.previousStartedAt,
  };
}

export async function notifyScopedInterventionChangedToBot(
  context: ServiceContext,
  input: {
    active: boolean;
    reason: string;
    session: CrmWhatsappSession;
    window: WhatsappInterventionWindow;
  },
  ports: CrmServicePorts,
) {
  const connection = await getCrmConnectionRepository(ports).findConnectionById(
    input.session.connectionId,
  );
  if (!connection) return;
  if (
    connection.storeId !== input.session.storeId ||
    connection.tenantId !== input.session.tenantId
  ) {
    return;
  }
  await notifyWhatsappInterventionChangedToBot(
    context,
    {
      active: input.active,
      connection,
      endedAt: input.window.endedAt,
      reason: input.reason,
      session: input.session,
      startedAt: input.window.startedAt,
    },
    ports,
  );
}
