import type { ServiceContext } from "../../../../../shared/serviceContext.js";
import { createServiceLogMetadata } from "../../../../../shared/serviceContext.js";
import {
  canonicalExternalBotActionRequest,
  type ExternalBotActionRequest,
} from "../../externalBotCanonicalRequest.js";
import { botError } from "../../externalBotErrors.js";
import type { ExternalBotManagerPorts } from "../../ports/externalBotPorts.js";
import {
  auditBotOperation,
  requireExternalBotScope,
} from "./serviceSupport.js";

export function assertExactExternalBotContextScope(
  context: ServiceContext,
  input: ExternalBotActionRequest,
) {
  const scope = requireExternalBotScope(context);
  if (
    scope.storeId !== input.storeId ||
    scope.tenantId !== input.tenantId ||
    context.actor.externalId !== input.integrationId
  ) {
    throw botError(
      "CRM_BOT_SCOPE_MISMATCH",
      "Bot action scope does not match its credential.",
      403,
    );
  }
}

export function assertExternalBotRequestDigest(
  input: ExternalBotActionRequest,
  ports: ExternalBotManagerPorts,
) {
  const { requestDigest: _requestDigest, ...unsigned } = input;
  const expected = ports.digest.digest(
    canonicalExternalBotActionRequest(unsigned),
  );
  if (!ports.digest.equals(expected, input.requestDigest)) {
    throw botError(
      "CRM_BOT_REQUEST_DIGEST_INVALID",
      "Request digest is invalid.",
      401,
    );
  }
}

export function auditCompletedExternalBotAction(
  context: ServiceContext,
  actionId: string,
  action: string,
) {
  return auditBotOperation(context, {
    action: "crm.bot.action.completed",
    entityId: actionId,
    metadata: { action },
    outcome: "succeeded",
    summary: "Complete external CRM bot action",
  });
}

export function logStartedExternalBotAction(
  context: ServiceContext,
  input: ExternalBotActionRequest,
) {
  context.logger.info(
    "crm.bot.action.execute.started",
    createServiceLogMetadata(context, {
      action: input.command.action,
      channel: input.channel,
      connectionId: input.connectionId,
      integrationId: input.integrationId,
      provider: input.provider,
      threadId: input.threadId,
    }),
  );
}
