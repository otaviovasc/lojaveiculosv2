import { createHash } from "node:crypto";
import type { ServiceContext } from "../../../../../shared/serviceContext.js";
import type {
  ExternalBotEvent,
  ExternalBotEventPayload,
  ExternalBotScope,
} from "../../externalBotModels.js";
import type { ExternalBotManagerPorts } from "../../ports/externalBotPorts.js";
import { assertExternalBotPayloadSafe } from "../../externalBotPrivacy.js";
import { botError } from "../../externalBotErrors.js";
import {
  assertExternalBotChannelProvider,
  assertPermission,
  auditBotOperation,
  requireExternalBotScope,
} from "./serviceSupport.js";

export async function enqueueAttendanceNotification(
  context: ServiceContext,
  input: Omit<ExternalBotScope, "storeId" | "tenantId"> & {
    expectedAttendanceRevision: number;
    expectedRevision: number;
    idempotencyKey: string;
    payload: ExternalBotEventPayload;
  },
  ports: ExternalBotManagerPorts,
) {
  assertPermission(context, "crm.bot.events.publish");
  const scope = { ...input, ...requireExternalBotScope(context) };
  assertExternalBotChannelProvider(scope);
  assertExternalBotPayloadSafe(input.payload);
  const snapshot = await ports.effectAuthorizer.inspect(scope);
  if (
    !snapshot.scopeExists ||
    snapshot.revision !== input.expectedRevision ||
    snapshot.attendanceRevision !== input.expectedAttendanceRevision ||
    input.payload.channel !== scope.channel ||
    input.payload.humanAttendanceActive !== snapshot.humanAttendanceActive
  ) {
    throw botError(
      "CRM_BOT_SCOPE_MISMATCH",
      "Attendance notification scope or revision changed.",
      409,
    );
  }
  const disabledAt = await ports.killSwitches.resolve(
    scope,
    "conversation.summarize",
    "effect",
  );
  if (disabledAt) {
    throw botError(
      "CRM_BOT_POLICY_DENIED",
      "Attendance notifications are disabled by a kill switch.",
      403,
    );
  }
  const now = (ports.now ?? (() => new Date()))();
  const digest = createHash("sha256")
    .update(
      JSON.stringify([
        scope.tenantId,
        scope.storeId,
        scope.integrationId,
        scope.connectionId,
        scope.threadId,
        input.idempotencyKey,
      ]),
    )
    .digest("hex");
  const event: ExternalBotEvent = {
    ...scope,
    actionClass: "notification",
    authorizedRequestDigest: digest,
    // Notifications cannot authorize any bot action.
    grant: null,
    // Existing outbox expiry also bounds notification delivery/retention.
    grantExpiresAt: new Date(now.getTime() + 24 * 60 * 60_000),
    id: `${digest.slice(0, 8)}-${digest.slice(8, 12)}-5${digest.slice(13, 16)}-8${digest.slice(17, 20)}-${digest.slice(20, 32)}`,
    occurredAt: now,
    payload: input.payload,
    type: "human_attendance_changed",
  };
  await ports.eventOutbox.enqueue(event);
  await auditBotOperation(context, {
    action: "crm.bot.attendance_notification.enqueued",
    entityId: event.id,
    metadata: { attendanceRevision: input.expectedAttendanceRevision },
    outcome: "succeeded",
    summary: "Enqueue external CRM attendance notification",
  });
  return event;
}
