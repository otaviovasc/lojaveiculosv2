import {
  conversationAttendanceEvents,
  conversationCycles,
} from "@lojaveiculosv2/db";
import type { conversationAttendances } from "@lojaveiculosv2/db";
import { and, eq } from "drizzle-orm";
import type {
  TransitionCrmWhatsappAttendanceInput,
  UpdateCrmWhatsappSessionInput,
} from "../../../domains/crm/ports/crmWhatsappRepository.js";
import type { DrizzleCrmClient } from "./drizzleCrmRepository.js";
import { toCanonicalAttendance } from "./drizzleCrmWhatsappSessionPreview.js";

export async function persistAttendanceTransitionEventIfChanged(input: {
  current: typeof conversationAttendances.$inferSelect;
  db: DrizzleCrmClient;
  nextState: (typeof conversationAttendances.$inferSelect)["state"];
  update: UpdateCrmWhatsappSessionInput;
}) {
  if (input.nextState === input.current.state) return;
  if (!isAttendanceTransition(input.update)) {
    throw new Error(
      "Canonical CRM attendance state changes require transition evidence.",
    );
  }
  assertTransitionMatchesCurrent(input.current, input.update);
  await input.db.insert(conversationAttendanceEvents).values({
    actorId: input.update.actorId,
    actorKind: input.update.actorKind,
    cycleId: input.current.cycleId,
    idempotencyKey: input.update.idempotencyKey,
    interventionId: input.update.interventionIdForLedger,
    nextState: input.nextState,
    occurredAt: input.update.occurredAt,
    previousState: input.current.state,
    reason: input.update.reason,
    requestFingerprint: input.update.requestFingerprint,
    stateVersion: input.update.humanAttendanceStateVersion!,
    storeId: input.current.storeId,
    tenantId: input.current.tenantId,
    threadId: input.current.threadId,
  });
}

export async function findAttendanceTransitionEvent(
  db: DrizzleCrmClient,
  input: TransitionCrmWhatsappAttendanceInput,
) {
  const [row] = await db
    .select({ event: conversationAttendanceEvents })
    .from(conversationAttendanceEvents)
    .innerJoin(
      conversationCycles,
      and(
        eq(conversationCycles.id, conversationAttendanceEvents.cycleId),
        eq(conversationCycles.threadId, conversationAttendanceEvents.threadId),
        eq(conversationCycles.storeId, conversationAttendanceEvents.storeId),
        eq(conversationCycles.tenantId, conversationAttendanceEvents.tenantId),
      ),
    )
    .where(
      and(
        eq(conversationAttendanceEvents.cycleId, input.sessionId),
        eq(conversationAttendanceEvents.idempotencyKey, input.idempotencyKey),
        eq(conversationAttendanceEvents.storeId, input.storeId),
        eq(conversationAttendanceEvents.tenantId, input.tenantId),
      ),
    )
    .limit(1);
  return row?.event ?? null;
}

export function assertMatchingAttendanceEvent(
  event: typeof conversationAttendanceEvents.$inferSelect,
  input: TransitionCrmWhatsappAttendanceInput,
) {
  if (
    event.actorId !== input.actorId ||
    event.actorKind !== input.actorKind ||
    event.interventionId !== input.interventionIdForLedger ||
    event.nextState !== toCanonicalAttendance(input.nextState) ||
    event.previousState !== toCanonicalAttendance(input.previousState) ||
    event.reason !== input.reason ||
    event.requestFingerprint !== input.requestFingerprint ||
    event.stateVersion !== input.humanAttendanceStateVersion
  ) {
    throw new Error(
      "CRM attendance idempotency key was reused with a different request.",
    );
  }
}

function isAttendanceTransition(
  input: UpdateCrmWhatsappSessionInput,
): input is TransitionCrmWhatsappAttendanceInput {
  return "idempotencyKey" in input && "requestFingerprint" in input;
}

function assertTransitionMatchesCurrent(
  current: typeof conversationAttendances.$inferSelect,
  input: TransitionCrmWhatsappAttendanceInput,
) {
  if (
    toCanonicalAttendance(input.previousState) !== current.state ||
    toCanonicalAttendance(input.nextState) === current.state ||
    input.humanAttendanceStateVersion !== current.stateVersion + 1
  ) {
    throw new Error(
      "Canonical CRM attendance transition evidence does not match the persisted state.",
    );
  }
}
