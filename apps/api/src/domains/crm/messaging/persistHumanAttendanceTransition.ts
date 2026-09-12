import { createHash } from "node:crypto";
import type {
  CrmHumanAttendanceState,
  CrmInterventionActorKind,
  CrmConversationRepository,
  CrmConversationCycle,
  UpdateCrmConversationCycleInput,
} from "../ports/crmConversationRepository.js";

type AttendanceUpdate = Omit<
  UpdateCrmConversationCycleInput,
  "cycleId" | "storeId" | "tenantId"
>;

export async function persistHumanAttendanceTransition(input: {
  actorId: string;
  actorKind: CrmInterventionActorKind;
  current: CrmConversationCycle;
  now: Date;
  reason: string;
  repository: CrmConversationRepository;
  source: string;
  update: AttendanceUpdate;
}) {
  const nextState =
    input.update.humanAttendanceState !== undefined
      ? input.update.humanAttendanceState
      : input.current.humanAttendanceState;
  if (nextState === input.current.humanAttendanceState) {
    const conversationCycle = await input.repository.updateConversationCycle({
      ...input.update,
      expectedRevision: input.current.revision,
      cycleId: input.current.id,
      storeId: input.current.storeId,
      tenantId: input.current.tenantId,
    });
    return conversationCycle ? { changed: true, conversationCycle } : null;
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
    cycleId: input.current.id,
    source: input.source,
    storeId: input.current.storeId,
    tenantId: input.current.tenantId,
  });
  return transitioned
    ? {
        changed: transitioned.transitionCreated,
        conversationCycle: transitioned.conversationCycle,
      }
    : null;
}

export function interventionActorKind(
  actorKind: "integration" | "public" | "system" | "user",
  source: string,
): CrmInterventionActorKind {
  if (actorKind === "user") return "user";
  if (actorKind === "system") return "system";
  if (actorKind === "public") return "support";
  return ["ai_request", "bot"].includes(source) ? "bot" : "provider";
}

function attendanceRequestFingerprint(input: {
  actorId: string;
  actorKind: CrmInterventionActorKind;
  interventionId: string;
  nextState: CrmHumanAttendanceState | null;
  previousState: CrmHumanAttendanceState | null;
  reason: string;
  source: string;
}) {
  return createHash("sha256").update(JSON.stringify(input)).digest("hex");
}

function attendanceIdempotencyKey(
  interventionId: string,
  previousState: CrmHumanAttendanceState | null,
  nextState: CrmHumanAttendanceState | null,
) {
  return [
    "attendance",
    interventionId,
    previousState ?? "none",
    nextState ?? "none",
  ].join(":");
}
