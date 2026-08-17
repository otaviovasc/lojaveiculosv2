import { botError } from "../../externalBotErrors.js";
import type { ServiceContext } from "../../../../../shared/serviceContext.js";
import { createServiceLogMetadata } from "../../../../../shared/serviceContext.js";
import {
  canonicalExternalBotActionRequest,
  type ExternalBotActionRequest,
} from "../../externalBotCanonicalRequest.js";
import { assertCommandHasNoForbiddenPii } from "../../externalBotPrivacy.js";
import type { ExternalBotManagerPorts } from "../../ports/externalBotPorts.js";
import {
  assertPermission,
  assertExternalBotChannelProvider,
  cancelAction,
  cancelActionAudited,
  executeProposalAction,
  finishEffect,
  isProposalCommand,
  isCanonicalProviderEffectAction,
  requireExternalBotScope,
  transitionAction,
} from "./serviceSupport.js";

export async function executeExternalBotAction(
  context: ServiceContext,
  input: ExternalBotActionRequest,
  ports: ExternalBotManagerPorts,
) {
  assertPermission(context, "crm.bot.actions.execute");
  assertExactContextScope(context, input);
  assertExternalBotChannelProvider(input);
  context.logger.info(
    "crm.bot.action.execute.started",
    createServiceLogMetadata(context, {
      action: input.command.action,
      actionClass: input.actionClass,
      channel: input.channel,
      connectionId: input.connectionId,
      integrationId: input.integrationId,
      provider: input.provider,
      threadId: input.threadId,
    }),
  );
  assertCommandHasNoForbiddenPii(input.command);
  assertRequestDigest(input, ports);
  const actionRecordInput = {
    capabilityGrant: input.capabilityGrant,
    actionClass: input.actionClass,
    channel: input.channel,
    command: input.command,
    connectionId: input.connectionId,
    expectedRevision: input.expectedRevision,
    idempotencyKey: input.idempotencyKey,
    integrationId: input.integrationId,
    modelVersion: input.modelVersion,
    provider: input.provider,
    requestDigest: input.requestDigest,
    storeId: input.storeId,
    tenantId: input.tenantId,
    threadId: input.threadId,
  };
  const grantResult = await ports.grantStore.consume({
    action: input.command.action,
    actionClass: input.actionClass,
    channel: input.channel,
    connectionId: input.connectionId,
    now: (ports.now ?? (() => new Date()))(),
    integrationId: input.integrationId,
    modelVersion: input.modelVersion,
    provider: input.provider,
    requestDigest: input.requestDigest,
    storeId: input.storeId,
    tenantId: input.tenantId,
    threadId: input.threadId,
    token: input.capabilityGrant,
  });
  if (grantResult === "invalid") {
    await context.audit.record({
      action: "crm.bot.action.grant_denied",
      actor: context.actor,
      category: "data_change",
      entityId: input.integrationId,
      entityType: "crm_external_bot",
      metadata: { failureCode: "grant_invalid" },
      outcome: "failed",
      requestId: context.requestId,
      storeId: context.storeId,
      summary: "Deny external CRM bot grant",
      tenantId: context.tenantId,
    });
    throw botError(
      "CRM_BOT_GRANT_INVALID",
      "Capability grant is invalid.",
      403,
    );
  }
  const accepted = await ports.actionRepository.accept(actionRecordInput);
  if (accepted.kind === "conflict") {
    throw botError(
      "CRM_BOT_IDEMPOTENCY_CONFLICT",
      "Idempotency key was already used for a different request.",
      409,
    );
  }
  if (accepted.kind === "existing") return accepted.record;
  if (grantResult === "used") {
    throw botError(
      "CRM_BOT_GRANT_REUSED",
      "Capability grant was already consumed.",
      409,
    );
  }
  const record = accepted.record;
  await context.audit.record({
    action: "crm.bot.action.accepted",
    actor: context.actor,
    category: "data_change",
    entityId: record.id,
    entityType: "crm_external_bot",
    metadata: {
      action: input.command.action,
      channel: input.channel,
      connectionId: input.connectionId,
    },
    outcome: "attempted",
    requestId: context.requestId,
    storeId: context.storeId,
    summary: "Accept external CRM bot action",
    tenantId: context.tenantId,
  });
  const disabledAt = await ports.killSwitches.resolve(
    input,
    input.command.action,
  );
  if (disabledAt)
    return cancelActionAudited(
      context,
      record.id,
      `kill_switch_${disabledAt}`,
      ports,
    );
  const proposalMode =
    input.actionClass === "proposal" || isProposalCommand(input.command);
  if (!proposalMode && !isCanonicalProviderEffectAction(input.command)) {
    return cancelActionAudited(
      context,
      record.id,
      "action_not_operational",
      ports,
    );
  }
  const snapshot = await ports.effectAuthorizer.inspect(input);
  if (!snapshot.scopeExists || snapshot.revision !== input.expectedRevision) {
    return cancelActionAudited(
      context,
      record.id,
      "scope_or_revision_changed",
      ports,
    );
  }
  if (snapshot.humanAttendanceActive) {
    const proposalCommand = input.command;
    if (!proposalMode) {
      return cancelActionAudited(
        context,
        record.id,
        "human_attendance_active",
        ports,
      );
    }
    return executeProposalAction(
      record.id,
      { ...input, command: proposalCommand },
      ports,
      "proposal_only_human_attendance",
    );
  }
  const proposalCommand = input.command;
  if (proposalMode) {
    return executeProposalAction(
      record.id,
      { ...input, command: proposalCommand },
      ports,
    );
  }
  await transitionAction(record.id, ["accepted"], "authorized", ports);
  await transitionAction(record.id, ["authorized"], "claimed", ports);
  const recheck = await ports.effectAuthorizer.inspect(input);
  if (
    !recheck.scopeExists ||
    recheck.humanAttendanceActive ||
    recheck.revision !== input.expectedRevision
  ) {
    return cancelAction(record.id, "reauthorization_failed", ports, [
      "claimed",
    ]);
  }
  await transitionAction(record.id, ["claimed"], "executing", ports);
  const effect = await ports.effectDispatcher.dispatch({
    actionId: record.id,
    command: input.command,
    idempotencyKey: input.idempotencyKey,
    scope: input,
  });
  return finishEffect(record.id, effect, ports);
}

function assertExactContextScope(
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

function assertRequestDigest(
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
