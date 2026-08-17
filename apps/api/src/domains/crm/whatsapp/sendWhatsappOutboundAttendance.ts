import type { ServiceContext } from "../../../shared/serviceContext.js";
import type { CrmConnection } from "../ports/crmConnectionRepository.js";
import type {
  CrmWhatsappMessageSenderOrigin,
  CrmWhatsappMessageSenderType,
  CrmWhatsappInterventionActorKind,
  CrmWhatsappRepository,
  CrmWhatsappSession,
} from "../ports/crmWhatsappRepository.js";
import type { CrmServicePorts } from "../services/CrmService/serviceSupport.js";
import {
  humanAttendanceReason,
  humanAttendanceSource,
  transitionHumanAttendance,
} from "./humanAttendanceTransition.js";
import { notifyWhatsappInterventionChangedToBot } from "./whatsappBotWebhookForwarding.js";

export async function transitionConfirmedHumanOutboundAttendance(input: {
  actorId: string;
  actorKind: CrmWhatsappInterventionActorKind;
  interventionId: string;
  providerTimestamp: Date;
  repository: CrmWhatsappRepository;
  senderType: CrmWhatsappMessageSenderType;
  senderOrigin: CrmWhatsappMessageSenderOrigin;
  reason?: string;
  source?: string;
  session: CrmWhatsappSession;
}) {
  if (
    input.senderType !== "HUMAN" ||
    !["human_crm", "human_whatsapp"].includes(input.senderOrigin)
  ) {
    return { changed: false, previous: input.session, session: input.session };
  }
  return transitionHumanAttendance({
    actorId: input.actorId,
    actorKind: input.actorKind,
    command: {
      interventionId: input.session.interventionId ?? input.interventionId,
      kind: "start",
      reason: input.reason ?? "human_outbound_message",
      source: input.source ?? "admin",
      state: "IN_HUMAN_SERVICE",
    },
    now: input.providerTimestamp,
    repository: input.repository,
    session: input.session,
  });
}

export async function notifyHumanOutboundAttendanceStarted(
  context: ServiceContext,
  input: {
    changed: boolean;
    connection: CrmConnection;
    providerTimestamp: Date;
    session: CrmWhatsappSession;
  },
  ports: CrmServicePorts,
) {
  if (!input.changed) return;
  await notifyWhatsappInterventionChangedToBot(
    context,
    {
      active: true,
      attendanceChangedAt: input.session.humanAttendanceChangedAt,
      attendanceState: input.session.humanAttendanceState,
      attendanceStateVersion: input.session.humanAttendanceStateVersion,
      connection: input.connection,
      interventionId: input.session.interventionId,
      reason: humanAttendanceReason(input.session) ?? "human_outbound_message",
      session: input.session,
      source: humanAttendanceSource(input.session) ?? "admin",
      startedAt: input.session.humanTakeoverAt ?? input.providerTimestamp,
      triggeredBy: "admin",
    },
    ports,
  );
}
