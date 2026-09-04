import { assertPermission } from "../../../../shared/authorization.js";
import type { ServiceContext } from "../../../../shared/serviceContext.js";
import { createServiceLogMetadata } from "../../../../shared/serviceContext.js";
import { ensureCrmPipelineIntegrity } from "../../pipeline/ensureCrmPipelineIntegrity.js";
import type { CrmConversationCycle } from "../../ports/crmConversationRepository.js";
import { publishConversationCycleUpdate } from "../CrmMessagingService/serviceSupport.js";
import { sessionWithConnection } from "../CrmMessagingService/conversationCycleMutationSupport.js";
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
  findVisibleOutcomeSession,
  isActiveSession,
  listActiveLeadSessions,
  moveLeadToOutcomeStage,
} from "./crmLeadOutcomeMutationSupport.js";
import {
  CrmLeadNotFoundError,
  getCrmOutcomeRepository,
  getCrmRepository,
  requireCrmMessagingScope,
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

export async function concludeCrmAttendance(
  context: ServiceContext,
  input: ConcludeWhatsappAttendanceInput,
  ports: CrmServicePorts,
): Promise<ConcludeWhatsappAttendanceResult> {
  assertPermission(context, "crm.conversations.manage");
  const scope = requireCrmMessagingScope(context);
  validateConclusion(input);
  const fingerprint = fingerprintConclusion(input);

  const mutation = await runCrmTransaction(ports, async (transactionPorts) => {
    const initialSession = await findVisibleOutcomeSession(
      context,
      transactionPorts,
      input.cycleId,
    );
    const outcomeRepository = getCrmOutcomeRepository(transactionPorts);
    const replay = await outcomeRepository.findByCommandId({
      commandId: input.commandId,
      storeId: scope.storeId as never,
      tenantId: scope.tenantId as never,
    });
    if (replay) {
      assertOutcomeReplay(replay, fingerprint, input.cycleId);
      return {
        changed: [] as CrmConversationCycle[],
        replay,
        conversationCycle: initialSession,
      };
    }

    const conversationCycle = initialSession;
    if (!conversationCycle.leadId) {
      throw new CrmLeadOutcomeValidationError(
        "WhatsApp attendance must be linked to a CRM lead before conclusion.",
      );
    }
    await outcomeRepository.lockLead({
      leadId: conversationCycle.leadId,
      storeId: scope.storeId as never,
      tenantId: scope.tenantId as never,
    });
    const lockedReplay = await outcomeRepository.findByCommandId({
      commandId: input.commandId,
      storeId: scope.storeId as never,
      tenantId: scope.tenantId as never,
    });
    if (lockedReplay) {
      assertOutcomeReplay(lockedReplay, fingerprint, input.cycleId);
      const authoritative = await findVisibleOutcomeSession(
        context,
        transactionPorts,
        input.cycleId,
      );
      return {
        changed: [] as CrmConversationCycle[],
        replay: lockedReplay,
        conversationCycle: authoritative,
      };
    }
    const lockedSession = await findVisibleOutcomeSession(
      context,
      transactionPorts,
      input.cycleId,
    );
    const repository = getCrmRepository(transactionPorts);
    const lead = await repository.findLeadById({
      leadId: conversationCycle.leadId,
      storeId: scope.storeId as never,
      tenantId: scope.tenantId as never,
    });
    if (!lead) throw new CrmLeadNotFoundError(conversationCycle.leadId);
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
        changed: [] as CrmConversationCycle[],
        replay: outcome,
        conversationCycle: lockedSession,
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
    const conversationCycles =
      input.outcome === "lost"
        ? await listActiveLeadSessions(transactionPorts, scope, lead.id)
        : [lockedSession];
    const changed = await completeOutcomeSessions(
      transactionPorts,
      scope,
      conversationCycles,
      context,
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
    return { changed, replay: outcome, conversationCycle: origin };
  });

  for (const changed of mutation.changed) {
    const realtimeSession = await sessionWithConnection(
      changed,
      ports,
      changed.id,
    );
    await publishConversationCycleUpdate(ports, realtimeSession, scope);
  }
  const authoritative = await sessionWithConnection(
    mutation.conversationCycle,
    ports,
    input.cycleId,
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
      cycleId: input.cycleId,
    }),
  );
  return { result, conversationCycle: authoritative };
}

function isTerminalLead(status: string) {
  return status === "won" || status === "lost" || status === "archived";
}
