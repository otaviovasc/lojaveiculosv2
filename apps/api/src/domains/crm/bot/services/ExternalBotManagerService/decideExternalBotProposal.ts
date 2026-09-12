import type { ServiceContext } from "../../../../../shared/serviceContext.js";
import { botError } from "../../externalBotErrors.js";
import type { ExternalBotManagerPorts } from "../../ports/externalBotPorts.js";
import {
  assertPermission,
  auditBotOperation,
  cancelAction,
  finishEffect,
  requireExternalBotScope,
  transitionAction,
} from "./serviceSupport.js";

export type DecideExternalBotProposalInput = {
  decision: "approved" | "rejected";
  expectedRevision: number;
  proposalId: string;
  reason?: string;
};

export async function decideExternalBotProposal(
  context: ServiceContext,
  input: DecideExternalBotProposalInput,
  ports: ExternalBotManagerPorts,
) {
  assertPermission(context, "crm.bot.proposals.decide");
  const scope = requireExternalBotScope(context);
  if (context.actor.kind !== "user") {
    throw botError(
      "CRM_BOT_PERMISSION_DENIED",
      "A store user must decide external bot proposals.",
      403,
    );
  }
  const decision = await ports.proposalRecorder.decide({
    actorUserId: context.actor.id,
    decision: input.decision,
    expectedRevision: input.expectedRevision,
    proposalId: input.proposalId,
    ...(input.reason ? { reason: input.reason } : {}),
    ...scope,
  });
  if (decision.kind === "not_found") {
    throw botError(
      "CRM_BOT_PROPOSAL_NOT_FOUND",
      "Proposal was not found.",
      404,
    );
  }
  if (decision.kind === "conflict") {
    throw botError(
      "CRM_BOT_PROPOSAL_DECISION_CONFLICT",
      "Proposal decision changed concurrently.",
      409,
    );
  }
  await auditBotOperation(context, {
    action: `crm.bot.proposal.${input.decision}`,
    entityId: decision.proposal.id,
    metadata: {
      actionId: decision.action.id,
      decision: input.decision,
      idempotentReplay: decision.kind === "existing",
    },
    outcome: "succeeded",
    summary: `${input.decision === "approved" ? "Approve" : "Reject"} external CRM bot proposal`,
  });
  if (
    decision.kind === "existing" ||
    input.decision === "rejected" ||
    decision.action.status !== "authorized"
  ) {
    return decision;
  }
  const snapshot = await ports.effectAuthorizer.inspect(decision.action);
  if (
    !snapshot.scopeExists ||
    snapshot.humanAttendanceActive ||
    snapshot.revision !== decision.action.expectedRevision ||
    snapshot.attendanceRevision !== decision.action.expectedAttendanceRevision
  ) {
    const action = await cancelAction(
      decision.action.id,
      "proposal_approval_reauthorization_failed",
      ports,
      ["authorized"],
    );
    return { ...decision, action };
  }
  await transitionAction(decision.action.id, ["authorized"], "claimed", ports);
  const recheck = await ports.effectAuthorizer.inspect(decision.action);
  if (
    !recheck.scopeExists ||
    recheck.humanAttendanceActive ||
    recheck.revision !== decision.action.expectedRevision ||
    recheck.attendanceRevision !== decision.action.expectedAttendanceRevision
  ) {
    const action = await cancelAction(
      decision.action.id,
      "proposal_approval_reauthorization_failed",
      ports,
      ["claimed"],
    );
    return { ...decision, action };
  }
  await transitionAction(decision.action.id, ["claimed"], "executing", ports);
  const effect = await ports.effectDispatcher.dispatch({
    actionId: decision.action.id,
    command: decision.action.command,
    idempotencyKey: decision.action.idempotencyKey,
    scope: decision.action,
  });
  const action = await finishEffect(decision.action.id, effect, ports);
  if (action.status === "completed") {
    await auditBotOperation(context, {
      action: "crm.bot.action.completed",
      entityId: action.id,
      metadata: { action: action.command.action },
      outcome: "succeeded",
      summary: "Complete approved external CRM bot action",
    });
  }
  return {
    ...decision,
    action,
  };
}
