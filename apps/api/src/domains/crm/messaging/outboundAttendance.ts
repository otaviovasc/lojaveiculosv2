import type { ServiceContext } from "../../../shared/serviceContext.js";
import type { CrmConnection } from "../ports/crmConnectionRepository.js";
import type {
  CrmMessageSenderOrigin,
  CrmMessageSenderType,
  CrmInterventionActorKind,
  CrmConversationRepository,
  CrmConversationCycle,
} from "../ports/crmConversationRepository.js";
import type { CrmServicePorts } from "../services/CrmService/serviceSupport.js";
import {
  humanAttendanceReason,
  humanAttendanceSource,
  transitionHumanAttendance,
} from "./humanAttendanceTransition.js";
import { enqueueCrmAttendanceExternalBotEvent } from "../bot/externalBotEventForwarding.js";

export async function transitionConfirmedHumanOutboundAttendance(input: {
  actorId: string;
  actorKind: CrmInterventionActorKind;
  interventionId: string;
  providerTimestamp: Date;
  repository: CrmConversationRepository;
  senderType: CrmMessageSenderType;
  senderOrigin: CrmMessageSenderOrigin;
  reason?: string;
  source?: string;
  conversationCycle: CrmConversationCycle;
}) {
  if (
    input.senderType !== "HUMAN" ||
    !["human_crm", "human_channel"].includes(input.senderOrigin)
  ) {
    return {
      changed: false,
      previous: input.conversationCycle,
      conversationCycle: input.conversationCycle,
    };
  }
  return transitionHumanAttendance({
    actorId: input.actorId,
    actorKind: input.actorKind,
    command: {
      interventionId:
        input.conversationCycle.interventionId ?? input.interventionId,
      kind: "start",
      reason: input.reason ?? "human_outbound_message",
      source: input.source ?? "admin",
      state: "IN_HUMAN_SERVICE",
    },
    now: input.providerTimestamp,
    repository: input.repository,
    conversationCycle: input.conversationCycle,
  });
}

export async function notifyHumanOutboundAttendanceStarted(
  context: ServiceContext,
  input: {
    changed: boolean;
    connection: CrmConnection;
    providerTimestamp: Date;
    conversationCycle: CrmConversationCycle;
  },
  ports: CrmServicePorts,
) {
  if (!input.changed) return;
  await enqueueCrmAttendanceExternalBotEvent(
    context,
    {
      active: true,
      attendanceChangedAt: input.conversationCycle.humanAttendanceChangedAt,
      attendanceState: input.conversationCycle.humanAttendanceState,
      attendanceStateVersion:
        input.conversationCycle.humanAttendanceStateVersion,
      connection: input.connection,
      interventionId: input.conversationCycle.interventionId,
      reason:
        humanAttendanceReason(input.conversationCycle) ??
        "human_outbound_message",
      conversationCycle: input.conversationCycle,
      source: humanAttendanceSource(input.conversationCycle) ?? "admin",
      startedAt:
        input.conversationCycle.humanTakeoverAt ?? input.providerTimestamp,
      triggeredBy: "admin",
    },
    ports,
  );
}
