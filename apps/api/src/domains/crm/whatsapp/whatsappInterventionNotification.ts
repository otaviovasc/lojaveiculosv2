import type { ServiceContext } from "../../../shared/serviceContext.js";
import type { CrmWhatsappSession } from "../ports/crmWhatsappRepository.js";
import type { CrmInterventionSource } from "../ports/crmBotWebhookDispatcher.js";
import {
  humanAttendanceReason,
  humanAttendanceSource,
} from "./humanAttendanceTransition.js";
import {
  getCrmConnectionRepository,
  type CrmServicePorts,
} from "../services/CrmService/serviceSupport.js";
import { notifyWhatsappInterventionChangedToBot } from "./whatsappBotWebhookForwarding.js";

export type WhatsappInterventionWindow = {
  endedAt: Date | null;
  startedAt: Date | null;
};

export function interventionWindow(input: {
  enabled: boolean;
  now: Date;
  previousStartedAt: Date | null;
}): WhatsappInterventionWindow {
  return {
    endedAt: input.enabled ? null : input.now,
    startedAt: input.enabled
      ? (input.previousStartedAt ?? input.now)
      : input.previousStartedAt,
  };
}

export async function notifyScopedInterventionChangedToBot(
  context: ServiceContext,
  input: {
    active: boolean;
    previousSession?: CrmWhatsappSession;
    reason: string;
    session: CrmWhatsappSession;
    source?: CrmInterventionSource;
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
  const source =
    humanAttendanceSource(input.previousSession ?? input.session) ??
    input.source;
  await notifyWhatsappInterventionChangedToBot(
    context,
    {
      active: input.active,
      attendanceChangedAt: input.session.humanAttendanceChangedAt ?? null,
      attendanceState: input.session.humanAttendanceState ?? null,
      attendanceStateVersion: input.session.humanAttendanceStateVersion ?? null,
      connection,
      endedAt: input.window.endedAt,
      interventionId:
        (input.active
          ? input.session.interventionId
          : input.previousSession?.interventionId) ?? null,
      reason:
        humanAttendanceReason(input.previousSession ?? input.session) ??
        input.reason,
      session: input.session,
      ...(source ? { source } : {}),
      startedAt: input.window.startedAt,
      ...(input.source ? { triggeredBy: input.source } : {}),
    },
    ports,
  );
}
