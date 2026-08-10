import { randomUUID } from "node:crypto";
import type {
  CrmWhatsappHumanAttendanceState,
  CrmWhatsappRepository,
  CrmWhatsappSession,
  CrmWhatsappSessionStatus,
  UpdateCrmWhatsappSessionInput,
} from "../ports/crmWhatsappRepository.js";

export type HumanAttendanceStart = {
  interventionId?: string;
  kind: "start";
  reason: string;
  source: string;
  state: CrmWhatsappHumanAttendanceState;
};

export type HumanAttendanceClear = {
  interventionId?: string;
  kind: "clear";
  status: CrmWhatsappSessionStatus;
};

export type HumanAttendanceCommand =
  HumanAttendanceClear | HumanAttendanceStart;

export type HumanAttendanceTransitionResult = {
  changed: boolean;
  previous: CrmWhatsappSession;
  session: CrmWhatsappSession;
};

export function isWhatsappReaction(metadata: Record<string, unknown>) {
  const interactive = metadata.interactive;
  return (
    Boolean(interactive) &&
    typeof interactive === "object" &&
    !Array.isArray(interactive) &&
    (interactive as Record<string, unknown>).kind === "reaction"
  );
}

export async function transitionHumanAttendance(input: {
  command: HumanAttendanceCommand;
  now?: Date;
  repository: CrmWhatsappRepository;
  session: CrmWhatsappSession;
}): Promise<HumanAttendanceTransitionResult> {
  let current = input.session;
  const now = input.now ?? new Date();
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const update = humanAttendanceUpdate(current, input.command, now);
    if (!update) return { changed: false, previous: current, session: current };
    const updated = await input.repository.updateSession({
      ...update,
      expectedHumanAttendanceStateVersion: current.humanAttendanceStateVersion,
      expectedInterventionId: current.interventionId,
      expectedStatus: current.status,
      sessionId: current.id,
      storeId: current.storeId,
      tenantId: current.tenantId,
    });
    if (updated) return { changed: true, previous: current, session: updated };
    const [reloaded] = await input.repository.listSessions({
      limit: 1,
      offset: 0,
      sessionId: current.id,
      storeId: current.storeId,
      tenantId: current.tenantId,
    });
    if (!reloaded) throw new Error("CRM WhatsApp session disappeared.");
    current = reloaded;
  }
  throw new Error("CRM WhatsApp attendance transition conflicted repeatedly.");
}

export function humanAttendanceUpdate(
  session: CrmWhatsappSession,
  command: HumanAttendanceCommand,
  now: Date,
): Omit<
  UpdateCrmWhatsappSessionInput,
  | "expectedHumanAttendanceStateVersion"
  | "expectedInterventionId"
  | "expectedStatus"
  | "sessionId"
  | "storeId"
  | "tenantId"
> | null {
  if (command.kind === "clear") return clearUpdate(session, command, now);
  const attendanceMetadata = readHumanAttendanceMetadata(session);
  if (
    command.interventionId &&
    !session.interventionId &&
    attendanceMetadata?.active === false &&
    attendanceMetadata.interventionId === command.interventionId
  ) {
    return null;
  }
  if (
    command.interventionId &&
    session.interventionId &&
    command.interventionId !== session.interventionId
  ) {
    return null;
  }
  if (
    session.status === "HUMAN_TAKEOVER" &&
    session.humanAttendanceState === command.state
  ) {
    return null;
  }
  const acknowledgingWaitingHuman =
    session.status === "HUMAN_TAKEOVER" &&
    session.humanAttendanceState === "WAITING_HUMAN" &&
    command.state === "IN_HUMAN_SERVICE";
  if (session.humanAttendanceState && !acknowledgingWaitingHuman) return null;

  const interventionId =
    session.interventionId ?? command.interventionId ?? randomUUID();
  const startedAt = session.humanTakeoverAt ?? now;
  return {
    firstHandledAt:
      command.state === "IN_HUMAN_SERVICE"
        ? (session.firstHandledAt ?? now)
        : session.firstHandledAt,
    humanAttendanceChangedAt: now,
    humanAttendanceState: command.state,
    humanAttendanceStateVersion: (session.humanAttendanceStateVersion ?? 0) + 1,
    humanHandlingStartedAt:
      command.state === "IN_HUMAN_SERVICE"
        ? (session.humanHandlingStartedAt ?? now)
        : null,
    humanTakeoverAt: startedAt,
    interventionId,
    metadata: {
      ...session.metadata,
      humanAttendance:
        acknowledgingWaitingHuman && session.metadata.humanAttendance
          ? session.metadata.humanAttendance
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
  session: CrmWhatsappSession,
  command: HumanAttendanceClear,
  now: Date,
) {
  if (
    command.interventionId &&
    session.interventionId !== command.interventionId
  ) {
    return null;
  }
  const alreadyCleared =
    !session.humanAttendanceState &&
    !session.humanHandlingStartedAt &&
    !session.humanTakeoverAt &&
    !session.interventionId;
  if (alreadyCleared && session.status === command.status) return null;
  const clearingActiveAttendance =
    session.status === "HUMAN_TAKEOVER" &&
    Boolean(
      session.humanAttendanceState ||
      session.humanAttendanceStateVersion ||
      session.interventionId,
    );
  const preservingTombstone =
    !clearingActiveAttendance &&
    !session.humanAttendanceState &&
    session.humanAttendanceStateVersion !== null;
  const attendanceMetadata = readHumanAttendanceMetadata(session);
  const endedInterventionId =
    session.interventionId ?? attendanceMetadata?.interventionId ?? null;
  return {
    humanAttendanceChangedAt: clearingActiveAttendance
      ? now
      : preservingTombstone
        ? session.humanAttendanceChangedAt
        : null,
    humanAttendanceState: null,
    humanAttendanceStateVersion: clearingActiveAttendance
      ? (session.humanAttendanceStateVersion ?? 0) + 1
      : preservingTombstone
        ? session.humanAttendanceStateVersion
        : null,
    humanHandlingStartedAt: null,
    humanTakeoverAt: null,
    interventionId: null,
    metadata: clearingActiveAttendance
      ? {
          ...session.metadata,
          humanAttendance: {
            active: false,
            endedAt: now.toISOString(),
            interventionId: endedInterventionId,
            reason: attendanceMetadata?.reason ?? null,
            source: attendanceMetadata?.source ?? null,
          },
        }
      : session.metadata,
    status: command.status,
  };
}

export function humanAttendanceSource(session: CrmWhatsappSession) {
  const source = readHumanAttendanceMetadata(session)?.source;
  return typeof source === "string" ? source : null;
}

export function humanAttendanceReason(session: CrmWhatsappSession) {
  const reason = readHumanAttendanceMetadata(session)?.reason;
  return typeof reason === "string" ? reason : null;
}

function readHumanAttendanceMetadata(session: CrmWhatsappSession) {
  const value = session.metadata.humanAttendance;
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}
