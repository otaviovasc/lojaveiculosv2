import type { ServiceContext } from "../../../shared/serviceContext.js";
import type { CrmConnection } from "../ports/crmConnectionRepository.js";
import type { IngestCrmMessageResult } from "../ports/crmConversationRepositoryModels.js";
import type { CrmServicePorts } from "../services/CrmService/serviceSupport.js";
import {
  humanAttendanceReason,
  humanAttendanceSource,
  type HumanAttendanceTransitionResult,
} from "../messaging/humanAttendanceTransition.js";
import { enqueueCrmAttendanceExternalBotEvent } from "../bot/externalBotEventForwarding.js";
import type { ZapiAdSessionTransition } from "./zapiAdSessionTransition.js";

export async function publishZapiWhatsappAttendanceEnded(
  context: ServiceContext,
  input: {
    connection: CrmConnection;
    result: IngestCrmMessageResult;
    transition: ZapiAdSessionTransition;
  },
  ports: CrmServicePorts,
) {
  if (!input.transition.resumedIntervention) return;
  await enqueueCrmAttendanceExternalBotEvent(
    context,
    {
      active: false,
      connection: input.connection,
      endedAt: input.transition.endedAt,
      excludedMessageId: input.result.message.id,
      reason: "ad_initiated_conversation",
      attendanceChangedAt:
        input.transition.conversationCycle.humanAttendanceChangedAt,
      attendanceState: input.transition.conversationCycle.humanAttendanceState,
      attendanceStateVersion:
        input.transition.conversationCycle.humanAttendanceStateVersion,
      interventionId: input.transition.previousSession.interventionId,
      conversationCycle: input.result.conversationCycle,
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
    result: IngestCrmMessageResult;
  },
  ports: CrmServicePorts,
) {
  if (!input.attendanceTransition?.changed) return;
  await enqueueCrmAttendanceExternalBotEvent(
    context,
    {
      active: true,
      attendanceChangedAt:
        input.result.conversationCycle.humanAttendanceChangedAt,
      attendanceState: input.result.conversationCycle.humanAttendanceState,
      attendanceStateVersion:
        input.result.conversationCycle.humanAttendanceStateVersion,
      connection: input.connection,
      interventionId: input.result.conversationCycle.interventionId,
      reason:
        humanAttendanceReason(input.result.conversationCycle) ??
        "human_outbound_message",
      conversationCycle: input.result.conversationCycle,
      source: humanAttendanceSource(input.result.conversationCycle),
      triggeredBy: "seller_whatsapp",
    },
    ports,
  );
}
