import { createHash } from "node:crypto";
import type {
  CrmWhatsappHumanAttendanceState,
  CrmWhatsappInterventionActorKind,
  CrmWhatsappRepository,
  CrmWhatsappSession,
  UpdateCrmWhatsappSessionInput,
} from "../ports/crmWhatsappRepository.js";

type AttendanceUpdate = Omit<
  UpdateCrmWhatsappSessionInput,
  "sessionId" | "storeId" | "tenantId"
>;

export async function persistHumanAttendanceTransition(input: {
  actorId: string;
  actorKind: CrmWhatsappInterventionActorKind;
  current: CrmWhatsappSession;
  now: Date;
  reason: string;
  repository: CrmWhatsappRepository;
  source: string;
  update: AttendanceUpdate;
}) {
  const nextState =
    input.update.humanAttendanceState !== undefined
      ? input.update.humanAttendanceState
      : input.current.humanAttendanceState;
  if (nextState === input.current.humanAttendanceState) {
    const session = await input.repository.updateSession({
      ...input.update,
      expectedRevision: input.current.revision,
      sessionId: input.current.id,
      storeId: input.current.storeId,
      tenantId: input.current.tenantId,
    });
    return session ? { changed: true, session } : null;
  }

  const interventionId =
    input.update.interventionId ?? input.current.interventionId;
  if (!interventionId) {
    throw new Error(
      "CRM WhatsApp attendance transition has no intervention id.",
    );
  }
  const transitioned = await input.repository.transitionAttendance({
    ...input.update,
    actorId: input.actorId,
    actorKind: input.actorKind,
    expectedHumanAttendanceStateVersion:
      input.current.humanAttendanceStateVersion,
    expectedInterventionId: input.current.interventionId,
    expectedRevision: input.current.revision,
    expectedStatus: input.current.status,
    idempotencyKey: attendanceIdempotencyKey(
      interventionId,
      input.current.humanAttendanceState,
      nextState,
    ),
    interventionIdForLedger: interventionId,
    nextState,
    occurredAt: input.now,
    previousState: input.current.humanAttendanceState,
    reason: input.reason,
    requestFingerprint: attendanceRequestFingerprint({
      actorId: input.actorId,
      actorKind: input.actorKind,
      interventionId,
      nextState,
      previousState: input.current.humanAttendanceState,
      reason: input.reason,
      source: input.source,
    }),
    sessionId: input.current.id,
    source: input.source,
    storeId: input.current.storeId,
    tenantId: input.current.tenantId,
  });
  return transitioned
    ? {
        changed: transitioned.transitionCreated,
        session: transitioned.session,
      }
    : null;
}

export function interventionActorKind(
  actorKind: "integration" | "public" | "system" | "user",
  source: string,
): CrmWhatsappInterventionActorKind {
  if (actorKind === "user") return "user";
  if (actorKind === "system") return "system";
  if (actorKind === "public") return "support";
  return ["ai_request", "bot"].includes(source) ? "bot" : "provider";
}

function attendanceRequestFingerprint(input: {
  actorId: string;
  actorKind: CrmWhatsappInterventionActorKind;
  interventionId: string;
  nextState: CrmWhatsappHumanAttendanceState | null;
  previousState: CrmWhatsappHumanAttendanceState | null;
  reason: string;
  source: string;
}) {
  return createHash("sha256").update(JSON.stringify(input)).digest("hex");
}

function attendanceIdempotencyKey(
  interventionId: string,
  previousState: CrmWhatsappHumanAttendanceState | null,
  nextState: CrmWhatsappHumanAttendanceState | null,
) {
  return [
    "attendance",
    interventionId,
    previousState ?? "none",
    nextState ?? "none",
  ].join(":");
}
