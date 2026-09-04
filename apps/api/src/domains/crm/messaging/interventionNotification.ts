import type { ServiceContext } from "../../../shared/serviceContext.js";
import type { CrmConversationCycle } from "../ports/crmConversationRepository.js";
import type { CrmAttendanceChangeSource } from "../bot/externalBotEventForwarding.js";
import {
  humanAttendanceReason,
  humanAttendanceSource,
} from "./humanAttendanceTransition.js";
import {
  getCrmConnectionRepository,
  type CrmServicePorts,
} from "../services/CrmService/serviceSupport.js";
import { enqueueCrmAttendanceExternalBotEvent } from "../bot/externalBotEventForwarding.js";

export type CrmAttendanceWindow = {
  endedAt: Date | null;
  startedAt: Date | null;
};

export function interventionWindow(input: {
  enabled: boolean;
  now: Date;
  previousStartedAt: Date | null;
}): CrmAttendanceWindow {
  return {
    endedAt: input.enabled ? null : input.now,
    startedAt: input.enabled
      ? (input.previousStartedAt ?? input.now)
      : input.previousStartedAt,
  };
}

export async function enqueueScopedAttendanceExternalBotEvent(
  context: ServiceContext,
  input: {
    active: boolean;
    previousSession?: CrmConversationCycle;
    reason: string;
    conversationCycle: CrmConversationCycle;
    source?: CrmAttendanceChangeSource;
    window: CrmAttendanceWindow;
  },
  ports: CrmServicePorts,
) {
  const connection = await getCrmConnectionRepository(ports).findConnectionById(
    input.conversationCycle.connectionId,
  );
  if (!connection) return;
  if (
    connection.storeId !== input.conversationCycle.storeId ||
    connection.tenantId !== input.conversationCycle.tenantId
  ) {
    return;
  }
  const source =
    humanAttendanceSource(input.previousSession ?? input.conversationCycle) ??
    input.source;
  await enqueueCrmAttendanceExternalBotEvent(
    context,
    {
      active: input.active,
      attendanceChangedAt:
        input.conversationCycle.humanAttendanceChangedAt ?? null,
      attendanceState: input.conversationCycle.humanAttendanceState ?? null,
      attendanceStateVersion:
        input.conversationCycle.humanAttendanceStateVersion ?? null,
      connection,
      endedAt: input.window.endedAt,
      interventionId:
        (input.active
          ? input.conversationCycle.interventionId
          : input.previousSession?.interventionId) ?? null,
      reason:
        humanAttendanceReason(
          input.previousSession ?? input.conversationCycle,
        ) ?? input.reason,
      conversationCycle: input.conversationCycle,
      ...(source ? { source } : {}),
      startedAt: input.window.startedAt,
      ...(input.source ? { triggeredBy: input.source } : {}),
    },
    ports,
  );
}
