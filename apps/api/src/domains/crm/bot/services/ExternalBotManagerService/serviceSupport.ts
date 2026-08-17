import type { ServiceContext } from "../../../../../shared/serviceContext.js";
import type { ExternalBotActionRequest } from "../../externalBotCanonicalRequest.js";
import { botError } from "../../externalBotErrors.js";
import type {
  ExternalBotActionRecord,
  ExternalBotCommand,
  ExternalBotScope,
} from "../../externalBotModels.js";
import type { ExternalBotManagerPorts } from "../../ports/externalBotPorts.js";

export function requireExternalBotScope(
  context: ServiceContext,
): Pick<ExternalBotScope, "storeId" | "tenantId"> {
  if (!context.storeId || !context.tenantId) {
    throw botError("CRM_BOT_SCOPE_REQUIRED", "Bot scope is required.", 403);
  }
  return { storeId: context.storeId, tenantId: context.tenantId };
}

export function assertPermission(
  context: ServiceContext,
  permission: "crm.bot.actions.execute" | "crm.bot.events.publish",
) {
  if (context.permissions.includes(permission)) return;
  const error = botError(
    "CRM_BOT_PERMISSION_DENIED",
    "Bot operation is not authorized.",
    403,
  );
  throw error;
}

export function assertExternalBotChannelProvider(
  scope: Pick<ExternalBotScope, "channel" | "provider">,
) {
  const valid =
    (scope.provider === "zapi" && scope.channel === "whatsapp") ||
    (scope.provider === "olx" && scope.channel === "olx_chat") ||
    (scope.provider === "meta_cloud" &&
      (scope.channel === "instagram" || scope.channel === "whatsapp"));
  if (valid) return;
  throw botError(
    "CRM_BOT_SCOPE_MISMATCH",
    "Bot channel does not match its bound provider connection.",
    403,
  );
}

export async function auditBotOperation(
  context: ServiceContext,
  input: {
    action: string;
    entityId: string;
    metadata?: Record<string, boolean | number | string | null>;
    outcome: "attempted" | "failed" | "succeeded";
    summary: string;
  },
) {
  context.logger.info(input.action, {
    entityId: input.entityId,
    outcome: input.outcome,
    requestId: context.requestId,
    storeId: context.storeId,
    tenantId: context.tenantId,
    ...(input.metadata ?? {}),
  });
  await context.audit.record({
    action: input.action,
    actor: context.actor,
    category: "data_change",
    entityId: input.entityId,
    entityType: "crm_external_bot",
    metadata: input.metadata ?? {},
    outcome: input.outcome,
    requestId: context.requestId,
    storeId: context.storeId,
    summary: input.summary,
    tenantId: context.tenantId,
  });
}

export function isProposalCommand(
  command: ExternalBotCommand,
): command is Extract<ExternalBotCommand, { action: `${string}.propose` }> {
  return (
    command.action === "fact.propose" ||
    command.action === "vehicle_interest.propose" ||
    command.action === "appointment.propose"
  );
}

export function isCanonicalProviderEffectAction(command: ExternalBotCommand) {
  return (
    command.action === "message.send_text" ||
    command.action === "message.send_media" ||
    command.action === "message.send_template" ||
    command.action === "message.send" ||
    command.action === "handoff.request"
  );
}

export async function cancelAction(
  id: string,
  code: string,
  ports: ExternalBotManagerPorts,
  expected: readonly ExternalBotActionRecord["status"][] = ["accepted"],
) {
  return requireTransition(
    await ports.actionRepository.transition(id, expected, "cancelled", code),
  );
}

export async function cancelActionAudited(
  context: ServiceContext,
  id: string,
  code: string,
  ports: ExternalBotManagerPorts,
) {
  const record = await cancelAction(id, code, ports);
  await auditBotOperation(context, {
    action: "crm.bot.action.cancelled",
    entityId: id,
    metadata: { failureCode: code },
    outcome: "failed",
    summary: "Cancel external CRM bot action",
  });
  return record;
}

export async function transitionAction(
  id: string,
  expected: readonly ("accepted" | "authorized" | "claimed")[],
  status: "authorized" | "claimed" | "executing",
  ports: ExternalBotManagerPorts,
) {
  return requireTransition(
    await ports.actionRepository.transition(id, expected, status),
  );
}

export async function finishEffect(
  id: string,
  effect: Awaited<
    ReturnType<ExternalBotManagerPorts["effectDispatcher"]["dispatch"]>
  >,
  ports: ExternalBotManagerPorts,
) {
  if (effect.kind === "succeeded") {
    await transitionProviderSucceeded(id, ports);
    return requireTransition(
      await ports.actionRepository.transition(
        id,
        ["provider_succeeded"],
        "completed",
      ),
    );
  }
  if (effect.kind === "queued") {
    return requireTransition(
      await ports.actionRepository.transition(id, ["executing"], "executing"),
    );
  }
  if (effect.kind === "indeterminate") {
    return requireTransition(
      await ports.actionRepository.transition(
        id,
        ["executing"],
        "indeterminate",
        effect.code,
      ),
    );
  }
  return requireTransition(
    await ports.actionRepository.transition(
      id,
      ["executing"],
      effect.retryable ? "retryable_failed" : "dead_letter",
      effect.code,
    ),
  );
}
export async function executeProposalAction(
  id: string,
  input: ExternalBotActionRequest & {
    command: ExternalBotCommand;
  },
  ports: ExternalBotManagerPorts,
  completionCode?: string,
) {
  await transitionAction(id, ["accepted"], "authorized", ports);
  await transitionAction(id, ["authorized"], "claimed", ports);
  const recheck = await ports.effectAuthorizer.inspect(input);
  if (!recheck.scopeExists || recheck.revision !== input.expectedRevision) {
    return cancelAction(id, "proposal_reauthorization_failed", ports, [
      "claimed",
    ]);
  }
  await transitionAction(id, ["claimed"], "executing", ports);
  const proposal = await ports.proposalRecorder.record({
    actionId: id,
    command: input.command,
    idempotencyKey: input.idempotencyKey,
    scope: input,
  });
  if (proposal.kind === "failed") {
    return requireTransition(
      await ports.actionRepository.transition(
        id,
        ["executing"],
        "dead_letter",
        proposal.code,
      ),
    );
  }
  await transitionProviderSucceeded(id, ports);
  return requireTransition(
    await ports.actionRepository.transition(
      id,
      ["provider_succeeded"],
      "completed",
      completionCode,
    ),
  );
}
async function transitionProviderSucceeded(
  id: string,
  ports: ExternalBotManagerPorts,
) {
  return requireTransition(
    await ports.actionRepository.transition(
      id,
      ["executing"],
      "provider_succeeded",
    ),
  );
}
function requireTransition<T>(record: T | null): T {
  if (record) return record;
  const error = botError(
    "CRM_BOT_STATE_CONFLICT",
    "Bot action state changed concurrently.",
    409,
  );
  throw error;
}
