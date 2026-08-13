import { assertPermission } from "../../../../shared/authorization.js";
import type { ServiceContext } from "../../../../shared/serviceContext.js";
import { createServiceLogMetadata } from "../../../../shared/serviceContext.js";
import { ensureCrmPipelineIntegrity } from "../../pipeline/ensureCrmPipelineIntegrity.js";
import type { CrmWhatsappSession } from "../../ports/crmWhatsappRepository.js";
import { publishWhatsappSessionUpdate } from "../CrmWhatsapp/serviceSupport.js";
import { sessionWithConnection } from "../CrmWhatsapp/whatsappSessionMutationSupport.js";
import type {
  ConcludeWhatsappAttendanceInput,
  ConcludeWhatsappAttendanceResult,
} from "./crmLeadOutcomeContracts.js";
import { CrmLeadOutcomeValidationError } from "./crmLeadOutcomeContracts.js";
import {
  assertOutcomeReplay,
  createConclusionOutcomeRecord,
  fingerprintConclusion,
  recordConclusionOutcomeAudit,
  validateConclusion,
} from "./crmLeadOutcomePersistence.js";
import {
  completeOutcomeSessions,
  createFollowUpTask,
  findOutcomeSession,
  isActiveSession,
  listActiveLeadSessions,
  moveLeadToOutcomeStage,
} from "./crmLeadOutcomeMutationSupport.js";
import {
  CrmLeadNotFoundError,
  getCrmOutcomeRepository,
  getCrmRepository,
  requireCrmWhatsappScope,
  runCrmTransaction,
  type CrmServicePorts,
} from "./serviceSupport.js";

export type {
  ApplyWonCrmLeadOutcomeInput,
  ApplyWonCrmLeadOutcomeResult,
  ConcludeWhatsappAttendanceInput,
  ConcludeWhatsappAttendanceResult,
} from "./crmLeadOutcomeContracts.js";
export {
  CrmLeadOutcomeCommandConflictError,
  CrmLeadOutcomeValidationError,
} from "./crmLeadOutcomeContracts.js";
export { applyWonCrmLeadOutcome } from "./applyWonCrmLeadOutcome.js";

export async function concludeWhatsappAttendance(
  context: ServiceContext,
  input: ConcludeWhatsappAttendanceInput,
  ports: CrmServicePorts,
): Promise<ConcludeWhatsappAttendanceResult> {
  assertPermission(context, "crm.whatsapp.close");
  const scope = requireCrmWhatsappScope(context);
  validateConclusion(input);
  const fingerprint = fingerprintConclusion(input);

  const mutation = await runCrmTransaction(ports, async (transactionPorts) => {
    const outcomeRepository = getCrmOutcomeRepository(transactionPorts);
    const replay = await outcomeRepository.findByCommandId({
      commandId: input.commandId,
      storeId: scope.storeId as never,
      tenantId: scope.tenantId as never,
    });
    if (replay) {
      assertOutcomeReplay(replay, fingerprint, input.sessionId);
      const session = await findOutcomeSession(
        transactionPorts,
        scope,
        input.sessionId,
      );
      return { changed: [] as CrmWhatsappSession[], replay, session };
    }

    const session = await findOutcomeSession(
      transactionPorts,
      scope,
      input.sessionId,
    );
    if (!session.leadId) {
      throw new CrmLeadOutcomeValidationError(
        "WhatsApp attendance must be linked to a CRM lead before conclusion.",
      );
    }
    await outcomeRepository.lockLead({
      leadId: session.leadId,
      storeId: scope.storeId as never,
      tenantId: scope.tenantId as never,
    });
    const lockedReplay = await outcomeRepository.findByCommandId({
      commandId: input.commandId,
      storeId: scope.storeId as never,
      tenantId: scope.tenantId as never,
    });
    if (lockedReplay) {
      assertOutcomeReplay(lockedReplay, fingerprint, input.sessionId);
      const authoritative = await findOutcomeSession(
        transactionPorts,
        scope,
        input.sessionId,
      );
      return {
        changed: [] as CrmWhatsappSession[],
        replay: lockedReplay,
        session: authoritative,
      };
    }
    const lockedSession = await findOutcomeSession(
      transactionPorts,
      scope,
      input.sessionId,
    );
    const repository = getCrmRepository(transactionPorts);
    const lead = await repository.findLeadById({
      leadId: session.leadId,
      storeId: scope.storeId as never,
      tenantId: scope.tenantId as never,
    });
    if (!lead) throw new CrmLeadNotFoundError(session.leadId);
    if (!isActiveSession(lockedSession) || isTerminalLead(lead.status)) {
      const outcome = await outcomeRepository.create(
        createConclusionOutcomeRecord(
          context,
          input,
          fingerprint,
          lead,
          lockedSession,
          "superseded",
        ),
      );
      assertOutcomeReplay(outcome, fingerprint, lockedSession.id);
      return {
        changed: [] as CrmWhatsappSession[],
        replay: outcome,
        session: lockedSession,
      };
    }

    await ensureCrmPipelineIntegrity(
      transactionPorts,
      { storeId: scope.storeId as never, tenantId: scope.tenantId as never },
      lead.pipelineId,
    );
    const previousPipelineStageId = lead.pipelineStageId;
    const nextLead =
      input.outcome === "lost"
        ? await moveLeadToOutcomeStage(transactionPorts, scope, lead, "lost")
        : lead;
    const sessions =
      input.outcome === "lost"
        ? await listActiveLeadSessions(transactionPorts, scope, lead.id)
        : [lockedSession];
    const changed = await completeOutcomeSessions(
      transactionPorts,
      scope,
      sessions,
    );
    const origin =
      changed.find((item) => item.id === lockedSession.id) ?? lockedSession;
    if (input.outcome === "follow_up" && input.reminder) {
      await createFollowUpTask(
        transactionPorts,
        context,
        scope,
        lead.id,
        lockedSession.id,
        input.commandId,
        input.reminder.dueAt,
      );
    }
    const outcome = await outcomeRepository.create(
      createConclusionOutcomeRecord(
        context,
        input,
        fingerprint,
        nextLead,
        lockedSession,
        "applied",
        previousPipelineStageId,
      ),
    );
    assertOutcomeReplay(outcome, fingerprint, lockedSession.id);
    return { changed, replay: outcome, session: origin };
  });

  for (const changed of mutation.changed) {
    const realtimeSession = await sessionWithConnection(
      changed,
      ports,
      changed.id,
    );
    await publishWhatsappSessionUpdate(ports, realtimeSession, scope);
  }
  const authoritative = await sessionWithConnection(
    mutation.session,
    ports,
    input.sessionId,
  );
  const result =
    mutation.replay.result === "superseded"
      ? "superseded"
      : mutation.changed.length
        ? "applied"
        : "already_applied";
  await recordConclusionOutcomeAudit(context, mutation.replay, result);
  context.logger.info(
    "crm.lead.outcome.completed",
    createServiceLogMetadata(context, {
      commandId: input.commandId,
      leadId: mutation.replay.leadId,
      outcome: input.outcome,
      result,
      sessionId: input.sessionId,
    }),
  );
  return { result, session: authoritative };
}

function isTerminalLead(status: string) {
  return status === "won" || status === "lost" || status === "archived";
}
