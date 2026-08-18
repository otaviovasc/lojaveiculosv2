import { randomUUID } from "node:crypto";
import type {
  CrmHumanAttendanceState,
  CrmConversationCycle,
  CrmConversationCycleStatus,
  UpdateCrmConversationCycleInput,
} from "../ports/crmConversationRepository.js";

export type HumanAttendanceStart = {
  interventionId?: string;
  kind: "start";
  reason: string;
  source: string;
  state: CrmHumanAttendanceState;
};

export type HumanAttendanceClear = {
  interventionId?: string;
  kind: "clear";
  status: CrmConversationCycleStatus;
};

export type HumanAttendanceCommand =
  HumanAttendanceClear | HumanAttendanceStart;

export function humanAttendanceUpdate(
  conversationCycle: CrmConversationCycle,
  command: HumanAttendanceCommand,
  now: Date,
): Omit<
  UpdateCrmConversationCycleInput,
  | "expectedHumanAttendanceStateVersion"
  | "expectedInterventionId"
  | "expectedStatus"
  | "cycleId"
  | "storeId"
  | "tenantId"
> | null {
  if (command.kind === "clear")
    return clearUpdate(conversationCycle, command, now);
  const attendanceMetadata = readHumanAttendanceMetadata(conversationCycle);
  if (
    command.interventionId &&
    !conversationCycle.interventionId &&
    attendanceMetadata?.active === false &&
    attendanceMetadata.interventionId === command.interventionId
  ) {
    return null;
  }
  if (
    command.interventionId &&
    conversationCycle.interventionId &&
    command.interventionId !== conversationCycle.interventionId
  ) {
    return null;
  }
  if (
    conversationCycle.status === "HUMAN_TAKEOVER" &&
    conversationCycle.humanAttendanceState === command.state
  ) {
    return null;
  }
  const acknowledgingWaitingHuman =
    conversationCycle.status === "HUMAN_TAKEOVER" &&
    conversationCycle.humanAttendanceState === "WAITING_HUMAN" &&
    command.state === "IN_HUMAN_SERVICE";
  if (conversationCycle.humanAttendanceState && !acknowledgingWaitingHuman)
    return null;

  const interventionId =
    conversationCycle.interventionId ?? command.interventionId ?? randomUUID();
  const startedAt = conversationCycle.humanTakeoverAt ?? now;
  return {
    firstHandledAt:
      command.state === "IN_HUMAN_SERVICE"
        ? (conversationCycle.firstHandledAt ?? now)
        : conversationCycle.firstHandledAt,
    humanAttendanceChangedAt: now,
    humanAttendanceState: command.state,
    humanAttendanceStateVersion:
      (conversationCycle.humanAttendanceStateVersion ?? 0) + 1,
    humanHandlingStartedAt:
      command.state === "IN_HUMAN_SERVICE"
        ? (conversationCycle.humanHandlingStartedAt ?? now)
        : null,
    humanTakeoverAt: startedAt,
    interventionId,
    metadata: {
      ...conversationCycle.metadata,
      humanAttendance:
        acknowledgingWaitingHuman && conversationCycle.metadata.humanAttendance
          ? conversationCycle.metadata.humanAttendance
          : {
              active: true,
              interventionId,
              reason: command.reason,
              source: command.source,
            },
    },
    status: "HUMAN_TAKEOVER",
  };
}

function clearUpdate(
  conversationCycle: CrmConversationCycle,
  command: HumanAttendanceClear,
  now: Date,
) {
  if (
    command.interventionId &&
    conversationCycle.interventionId !== command.interventionId
  ) {
    return null;
  }
  const alreadyCleared =
    !conversationCycle.humanAttendanceState &&
    !conversationCycle.humanHandlingStartedAt &&
    !conversationCycle.humanTakeoverAt &&
    !conversationCycle.interventionId;
  if (alreadyCleared && conversationCycle.status === command.status)
    return null;
  const clearingActiveAttendance =
    conversationCycle.status === "HUMAN_TAKEOVER" &&
    Boolean(
      conversationCycle.humanAttendanceState ||
      conversationCycle.humanAttendanceStateVersion ||
      conversationCycle.interventionId,
    );
  const preservingTombstone =
    !clearingActiveAttendance &&
    !conversationCycle.humanAttendanceState &&
    conversationCycle.humanAttendanceStateVersion !== null;
  const attendanceMetadata = readHumanAttendanceMetadata(conversationCycle);
  const endedInterventionId =
    conversationCycle.interventionId ??
    attendanceMetadata?.interventionId ??
    null;
  return {
    humanAttendanceChangedAt: clearingActiveAttendance
      ? now
      : preservingTombstone
        ? conversationCycle.humanAttendanceChangedAt
        : null,
    humanAttendanceState: null,
    humanAttendanceStateVersion: clearingActiveAttendance
      ? (conversationCycle.humanAttendanceStateVersion ?? 0) + 1
      : preservingTombstone
        ? conversationCycle.humanAttendanceStateVersion
        : null,
    humanHandlingStartedAt: null,
    humanTakeoverAt: null,
    interventionId: null,
    metadata: clearingActiveAttendance
      ? {
          ...conversationCycle.metadata,
          humanAttendance: {
            active: false,
            endedAt: now.toISOString(),
            interventionId: endedInterventionId,
            reason: attendanceMetadata?.reason ?? null,
            source: attendanceMetadata?.source ?? null,
          },
        }
      : conversationCycle.metadata,
    status: command.status,
  };
}

export function humanAttendanceSource(conversationCycle: CrmConversationCycle) {
  const source = readHumanAttendanceMetadata(conversationCycle)?.source;
  return typeof source === "string" ? source : null;
}

export function humanAttendanceReason(conversationCycle: CrmConversationCycle) {
  const reason = readHumanAttendanceMetadata(conversationCycle)?.reason;
  return typeof reason === "string" ? reason : null;
}

function readHumanAttendanceMetadata(conversationCycle: CrmConversationCycle) {
  const value = conversationCycle.metadata.humanAttendance;
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}
