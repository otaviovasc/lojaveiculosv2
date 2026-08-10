import type { ServiceContext } from "../../../shared/serviceContext.js";
import type { CrmConnection } from "../ports/crmConnectionRepository.js";
import type { IngestCrmWhatsappMessageResult } from "../ports/crmWhatsappRepositoryModels.js";
import type { CrmServicePorts } from "../services/CrmService/serviceSupport.js";
import {
  humanAttendanceReason,
  humanAttendanceSource,
  type HumanAttendanceTransitionResult,
} from "./humanAttendanceTransition.js";
import { notifyWhatsappInterventionChangedToBot } from "./whatsappBotWebhookForwarding.js";
import type { ZapiAdSessionTransition } from "./zapiAdSessionTransition.js";

export async function publishZapiWhatsappAttendanceEnded(
  context: ServiceContext,
  input: {
    connection: CrmConnection;
    result: IngestCrmWhatsappMessageResult;
    transition: ZapiAdSessionTransition;
  },
  ports: CrmServicePorts,
) {
  if (!input.transition.resumedIntervention) return;
  await notifyWhatsappInterventionChangedToBot(
    context,
    {
      active: false,
      connection: input.connection,
      endedAt: input.transition.endedAt,
      excludedMessageId: input.result.message.id,
      reason: "ad_initiated_conversation",
      attendanceChangedAt: input.transition.session.humanAttendanceChangedAt,
      attendanceState: input.transition.session.humanAttendanceState,
      attendanceStateVersion:
        input.transition.session.humanAttendanceStateVersion,
      interventionId: input.transition.previousSession.interventionId,
      session: input.result.session,
      source: humanAttendanceSource(input.transition.previousSession),
      startedAt: input.transition.interventionStartedAt,
      triggeredBy: "auto",
    },
    ports,
  );
}

export async function publishZapiWhatsappAttendanceStarted(
  context: ServiceContext,
  input: {
    attendanceTransition: HumanAttendanceTransitionResult | null;
    connection: CrmConnection;
    result: IngestCrmWhatsappMessageResult;
  },
  ports: CrmServicePorts,
) {
  if (!input.attendanceTransition?.changed) return;
  await notifyWhatsappInterventionChangedToBot(
    context,
    {
      active: true,
      attendanceChangedAt: input.result.session.humanAttendanceChangedAt,
      attendanceState: input.result.session.humanAttendanceState,
      attendanceStateVersion: input.result.session.humanAttendanceStateVersion,
      connection: input.connection,
      interventionId: input.result.session.interventionId,
      reason:
        humanAttendanceReason(input.result.session) ?? "human_outbound_message",
      session: input.result.session,
      source: humanAttendanceSource(input.result.session),
      triggeredBy: "seller_whatsapp",
    },
    ports,
  );
}
