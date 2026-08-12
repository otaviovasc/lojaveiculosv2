import type { ServiceContext } from "../../../../../shared/serviceContext.js";
import { createServiceLogMetadata } from "../../../../../shared/serviceContext.js";
import type {
  ExternalBotCommand,
  ExternalBotEventPayload,
  ExternalBotEventType,
  ExternalBotScope,
} from "../../externalBotModels.js";
import type { ExternalBotManagerPorts } from "../../ports/externalBotPorts.js";
import { assertExternalBotPayloadSafe } from "../../externalBotPrivacy.js";
import { botError } from "../../externalBotErrors.js";
import { canonicalExternalBotActionRequest } from "../../externalBotCanonicalRequest.js";
import { assertPermission, requireExternalBotScope } from "./serviceSupport.js";

export type EnqueueExternalBotEventInput = Omit<
  ExternalBotScope,
  "storeId" | "tenantId"
> & {
  allowedAction: Parameters<
    ExternalBotManagerPorts["grantStore"]["issue"]
  >[0]["action"];
  authorizedCommand: ExternalBotCommand;
  expectedRevision: number;
  idempotencyKey: string;
  payload: Record<string, unknown>;
  type: ExternalBotEventType;
};

export async function enqueueExternalBotEvent(
  context: ServiceContext,
  input: EnqueueExternalBotEventInput,
  ports: ExternalBotManagerPorts,
) {
  assertPermission(context, "crm.bot.events.publish");
  if (!isSupportedInternalGrant(input.allowedAction)) {
    throw botError(
      "CRM_BOT_ACTION_UNSUPPORTED",
      "No safe executor is installed for this bot action.",
      422,
    );
  }
  const scope = { ...requireExternalBotScope(context), ...input };
  context.logger.info(
    "crm.bot.event.enqueue.started",
    createServiceLogMetadata(context, {
      actionClass: scope.actionClass,
      connectionId: scope.connectionId,
      integrationId: scope.integrationId,
      provider: scope.provider,
      threadId: scope.threadId,
    }),
  );
  assertExternalBotPayloadSafe(input.payload);
  const now = (ports.now ?? (() => new Date()))();
  const authorizedRequestDigest = ports.digest.digest(
    canonicalExternalBotActionRequest({
      actionClass: scope.actionClass,
      capabilityGrant: "",
      command: input.authorizedCommand,
      connectionId: scope.connectionId,
      expectedRevision: input.expectedRevision,
      idempotencyKey: input.idempotencyKey,
      integrationId: scope.integrationId,
      modelVersion: scope.modelVersion,
      provider: scope.provider,
      storeId: scope.storeId,
      tenantId: scope.tenantId,
      threadId: scope.threadId,
    }),
  );
  const grant = await ports.grantStore.issue({
    action: input.allowedAction,
    authorizedRequestDigest,
    actionClass: scope.actionClass,
    connectionId: scope.connectionId,
    expiresAt: new Date(now.getTime() + 90_000),
    integrationId: scope.integrationId,
    modelVersion: scope.modelVersion,
    provider: scope.provider,
    storeId: scope.storeId,
    tenantId: scope.tenantId,
    threadId: scope.threadId,
  });
  const event = {
    authorizedRequestDigest,
    grant: grant.token,
    grantExpiresAt: grant.expiresAt,
    id: ports.idGenerator(),
    occurredAt: now,
    payload: input.payload as ExternalBotEventPayload,
    type: input.type,
    connectionId: scope.connectionId,
    integrationId: scope.integrationId,
    storeId: scope.storeId,
    tenantId: scope.tenantId,
    threadId: scope.threadId,
    actionClass: scope.actionClass,
    modelVersion: scope.modelVersion,
    provider: scope.provider,
  };
  await ports.eventOutbox.enqueue(event);
  await context.audit.record({
    action: "crm.bot.event.enqueued",
    actor: context.actor,
    category: "data_change",
    entityId: event.id,
    entityType: "crm_external_bot",
    metadata: {
      allowedAction: input.allowedAction,
      connectionId: scope.connectionId,
      integrationId: scope.integrationId,
      threadId: scope.threadId,
    },
    outcome: "succeeded",
    requestId: context.requestId,
    storeId: context.storeId,
    summary: "Enqueue external CRM bot event",
    tenantId: context.tenantId,
  });
  context.logger.info(
    "crm.bot.event.enqueue.succeeded",
    createServiceLogMetadata(context, {
      connectionId: scope.connectionId,
      eventId: event.id,
      integrationId: scope.integrationId,
      threadId: scope.threadId,
    }),
  );
  return event;
}

function isSupportedInternalGrant(action: string) {
  return (
    action === "fact.propose" ||
    action === "vehicle_interest.propose" ||
    action === "appointment.propose"
  );
}
