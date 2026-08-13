import { assertPermission } from "../../../../shared/authorization.js";
import {
  createServiceLogMetadata,
  type ServiceContext,
} from "../../../../shared/serviceContext.js";
import type { CrmWhatsappSession } from "../../ports/crmWhatsappRepository.js";
import { publishWhatsappSessionUpdate } from "../CrmWhatsapp/serviceSupport.js";
import { sessionWithConnection } from "../CrmWhatsapp/whatsappSessionMutationSupport.js";
import type {
  ApplyWonCrmLeadOutcomeInput,
  ApplyWonCrmLeadOutcomeResult,
} from "./crmLeadOutcomeContracts.js";
import {
  assertOutcomeReplay,
  hashCrmOutcome,
} from "./crmLeadOutcomePersistence.js";
import {
  completeOutcomeSessions,
  findOutcomeSession,
  listActiveLeadSessions,
  moveLeadToOutcomeStage,
} from "./crmLeadOutcomeMutationSupport.js";
import { CrmLeadOutcomeValidationError } from "./crmLeadOutcomeContracts.js";
import {
  CrmLeadNotFoundError,
  getCrmOutcomeRepository,
  getCrmRepository,
  requireCrmScope,
  runCrmTransaction,
  type CrmServicePorts,
} from "./serviceSupport.js";

export async function applyWonCrmLeadOutcome(
  context: ServiceContext,
  input: ApplyWonCrmLeadOutcomeInput,
  ports: CrmServicePorts,
): Promise<ApplyWonCrmLeadOutcomeResult> {
  assertPermission(context, "sale.close");
  const scope = requireCrmScope(context);
  const fingerprint = hashCrmOutcome({ ...input, outcome: "won" });
  const mutation = await runCrmTransaction(ports, async (transactionPorts) => {
    const outcomes = getCrmOutcomeRepository(transactionPorts);
    await outcomes.lockLead({
      leadId: input.leadId,
      storeId: scope.storeId as never,
      tenantId: scope.tenantId as never,
    });
    const replay = await outcomes.findByCommandId({
      commandId: input.commandId,
      storeId: scope.storeId as never,
      tenantId: scope.tenantId as never,
    });
    if (replay) {
      assertOutcomeReplay(replay, fingerprint, input.originSessionId ?? null);
      return {
        changed: [] as CrmWhatsappSession[],
        outcome: replay,
        result: "already_applied" as const,
      };
    }
    const repository = getCrmRepository(transactionPorts);
    const lead = await repository.findLeadById({
      leadId: input.leadId,
      storeId: scope.storeId as never,
      tenantId: scope.tenantId as never,
    });
    if (!lead) throw new CrmLeadNotFoundError(input.leadId);
    if (
      lead.status === "won" ||
      lead.status === "lost" ||
      lead.status === "archived"
    ) {
      throw new CrmLeadOutcomeValidationError(
        "A terminal CRM lead cannot receive another won outcome.",
      );
    }
    const origin = input.originSessionId
      ? await findOutcomeSession(transactionPorts, scope, input.originSessionId)
      : null;
    if (origin && origin.leadId !== lead.id) {
      throw new CrmLeadOutcomeValidationError(
        "Origin attendance does not belong to the won CRM lead.",
      );
    }
    const previousPipelineStageId = lead.pipelineStageId;
    const nextLead = await moveLeadToOutcomeStage(
      transactionPorts,
      scope,
      lead,
      "won",
    );
    const sessions = await listActiveLeadSessions(
      transactionPorts,
      scope,
      lead.id,
    );
    const changed = await completeOutcomeSessions(
      transactionPorts,
      scope,
      sessions,
    );
    const outcome = await outcomes.create({
      actorId: context.actor.id,
      actorKind: context.actor.kind,
      channel: origin?.channel ?? sessions[0]?.channel ?? null,
      commandId: input.commandId,
      leadId: lead.id,
      lossNote: null,
      lossReason: null,
      nextPipelineStageId: nextLead.pipelineStageId,
      originSessionId: input.originSessionId ?? null,
      outcome: "won",
      previousPipelineStageId,
      requestFingerprint: fingerprint,
      result: "applied",
      saleId: input.saleId,
      storeId: scope.storeId as never,
      tenantId: scope.tenantId as never,
    });
    assertOutcomeReplay(outcome, fingerprint, input.originSessionId ?? null);
    return { changed, outcome, result: "applied" as const };
  });
  for (const changed of mutation.changed) {
    const realtimeSession = await sessionWithConnection(
      changed,
      ports,
      changed.id,
    );
    await publishWhatsappSessionUpdate(ports, realtimeSession, scope);
  }
  await context.audit.record({
    action: "crm.lead.outcome.apply_won",
    actor: context.actor,
    category: "data_change",
    entityId: mutation.outcome.id,
    entityType: "crm_lead_outcome",
    metadata: {
      commandId: mutation.outcome.commandId,
      leadId: mutation.outcome.leadId,
      permission: "sale.close",
      result: mutation.result,
      saleId: input.saleId,
    },
    outcome: "succeeded",
    requestId: context.requestId,
    storeId: mutation.outcome.storeId,
    tenantId: mutation.outcome.tenantId,
    summary: "Applied won CRM lead outcome",
  });
  context.logger.info(
    "crm.lead.outcome.won.completed",
    createServiceLogMetadata(context, {
      commandId: input.commandId,
      leadId: input.leadId,
      result: mutation.result,
      saleId: input.saleId,
    }),
  );
  return { outcome: mutation.outcome, result: mutation.result };
}
