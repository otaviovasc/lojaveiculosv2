import type { ServiceContext } from "../../../../../shared/serviceContext.js";
import type { ExternalBotActionRequest } from "../../externalBotCanonicalRequest.js";
import { botError } from "../../externalBotErrors.js";
import { assertCommandHasNoForbiddenPii } from "../../externalBotPrivacy.js";
import { assertExternalBotCommandOperationallySafe } from "../../externalBotCommandValidation.js";
import type { ExternalBotManagerPorts } from "../../ports/externalBotPorts.js";
import {
  assertPermission,
  assertExternalBotChannelProvider,
  cancelAction,
  cancelActionAudited,
  executeProposalAction,
  finishEffect,
  isCanonicalProviderEffectAction,
  transitionAction,
} from "./serviceSupport.js";
import {
  assertExactExternalBotContextScope,
  assertExternalBotRequestDigest,
  auditCompletedExternalBotAction,
  logStartedExternalBotAction,
} from "./executeExternalBotActionSupport.js";
import { resolveExternalBotExecutionPolicy } from "./resolveExternalBotExecutionPolicy.js";

export async function executeExternalBotAction(
  context: ServiceContext,
  input: ExternalBotActionRequest,
  ports: ExternalBotManagerPorts,
) {
  assertPermission(context, "crm.bot.actions.execute");
  assertExactExternalBotContextScope(context, input);
  assertExternalBotChannelProvider(input);
  logStartedExternalBotAction(context, input);
  assertCommandHasNoForbiddenPii(input.command);
  assertExternalBotCommandOperationallySafe(input.command);
  assertExternalBotRequestDigest(input, ports);
  const authorizationSnapshot = await ports.effectAuthorizer.inspect(input);
  const policyDecision = await resolveExternalBotExecutionPolicy(
    input,
    input.command.action,
    authorizationSnapshot.humanAttendanceActive,
    ports,
  );
  const actionClass: "effect" | "proposal" =
    policyDecision.configuredMode === "proposal" ? "proposal" : "effect";
  const actionRecordInput = {
    capabilityGrant: input.capabilityGrant,
    actionClass,
    channel: input.channel,
    command: input.command,
    connectionId: input.connectionId,
    expectedAttendanceRevision: input.expectedAttendanceRevision,
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
  const accepted = await ports.actionRepository.accept(actionRecordInput);
  if (accepted.kind === "grant_invalid") {
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
  if (accepted.kind === "grant_used") {
    throw botError(
      "CRM_BOT_GRANT_REUSED",
      "Capability grant was already consumed.",
      409,
    );
  }
  if (accepted.kind === "policy_denied") {
    throw botError(
      "CRM_BOT_POLICY_DENIED",
      `External bot policy denied command acceptance: ${accepted.code}.`,
      403,
    );
  }
  if (accepted.kind === "conflict") {
    throw botError(
      "CRM_BOT_IDEMPOTENCY_CONFLICT",
      "Idempotency key was already used for a different request.",
      409,
    );
  }
  if (accepted.kind === "existing") {
    if (
      (accepted.record.status === "executing" ||
        accepted.record.status === "retryable_failed") &&
      !isCanonicalProviderEffectAction(accepted.record.command)
    ) {
      if (accepted.record.status === "retryable_failed") {
        const reserved = await ports.actionRepository.transition(
          accepted.record.id,
          ["retryable_failed"],
          "executing",
        );
        if (!reserved) return accepted.record;
      }
      const effect = await ports.effectDispatcher.dispatch({
        actionId: accepted.record.id,
        command: accepted.record.command,
        idempotencyKey: accepted.record.idempotencyKey,
        scope: accepted.record,
      });
      const completed = await finishEffect(accepted.record.id, effect, ports);
      if (completed.status === "completed") {
        await auditCompletedExternalBotAction(
          context,
          completed.id,
          completed.command.action,
        );
      }
      return completed;
    }
    return accepted.record;
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
    actionClass,
  );
  if (disabledAt)
    return cancelActionAudited(
      context,
      record.id,
      `kill_switch_${disabledAt}`,
      ports,
    );
  if (!policyDecision.allowed) {
    return cancelActionAudited(
      context,
      record.id,
      `policy_${policyDecision.code}`,
      ports,
    );
  }
  const proposalMode = policyDecision.mode === "proposal";
  const snapshot = authorizationSnapshot;
  if (
    !snapshot.scopeExists ||
    snapshot.revision !== input.expectedRevision ||
    snapshot.attendanceRevision !== input.expectedAttendanceRevision
  ) {
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
    recheck.revision !== input.expectedRevision ||
    recheck.attendanceRevision !== input.expectedAttendanceRevision
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
  const completed = await finishEffect(record.id, effect, ports);
  if (completed.status === "completed") {
    await auditCompletedExternalBotAction(
      context,
      completed.id,
      completed.command.action,
    );
  }
  return completed;
}
