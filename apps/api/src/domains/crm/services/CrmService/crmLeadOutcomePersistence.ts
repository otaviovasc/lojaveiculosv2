import { createHash } from "node:crypto";
import type { ServiceContext } from "../../../../shared/serviceContext.js";
import type { CrmLeadOutcome } from "../../ports/crmOutcomeRepository.js";
import { crmLeadOutcomeLossReasons } from "../../ports/crmOutcomeRepository.js";
import type { CrmLead } from "../../ports/crmRepository.js";
import type { CrmWhatsappSession } from "../../ports/crmWhatsappRepository.js";
import type {
  ConcludeWhatsappAttendanceInput,
  ConcludeWhatsappAttendanceResult,
} from "./crmLeadOutcomeContracts.js";
import {
  CrmLeadOutcomeCommandConflictError,
  CrmLeadOutcomeValidationError,
} from "./crmLeadOutcomeContracts.js";

export function validateConclusion(input: ConcludeWhatsappAttendanceInput) {
  if (!input.commandId.trim())
    throw new CrmLeadOutcomeValidationError("commandId is required.");
  if (input.outcome === "follow_up" && input.reminder) {
    if (Number.isNaN(new Date(input.reminder.dueAt).getTime())) {
      throw new CrmLeadOutcomeValidationError("Reminder dueAt is invalid.");
    }
  }
  if (input.outcome === "lost") {
    if (!crmLeadOutcomeLossReasons.includes(input.reason)) {
      throw new CrmLeadOutcomeValidationError("Loss reason is invalid.");
    }
    if (input.reason === "other" && !input.note?.trim()) {
      throw new CrmLeadOutcomeValidationError(
        "Loss note is required for reason other.",
      );
    }
  }
}

export function fingerprintConclusion(input: ConcludeWhatsappAttendanceInput) {
  return hashCrmOutcome(
    input.outcome === "follow_up"
      ? {
          commandId: input.commandId,
          dueAt: input.reminder?.dueAt ?? null,
          outcome: input.outcome,
          sessionId: input.sessionId,
        }
      : {
          commandId: input.commandId,
          note: input.note?.trim() ?? null,
          outcome: input.outcome,
          reason: input.reason,
          sessionId: input.sessionId,
        },
  );
}

export function hashCrmOutcome(value: object) {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex");
}

export function assertOutcomeReplay(
  outcome: CrmLeadOutcome,
  fingerprint: string,
  originSessionId: string | null,
) {
  if (
    outcome.requestFingerprint !== fingerprint ||
    outcome.originSessionId !== originSessionId
  ) {
    throw new CrmLeadOutcomeCommandConflictError(
      "CRM lead outcome commandId was already used with another request.",
    );
  }
}

export function createConclusionOutcomeRecord(
  context: ServiceContext,
  input: ConcludeWhatsappAttendanceInput,
  requestFingerprint: string,
  lead: CrmLead,
  session: CrmWhatsappSession,
  result: "applied" | "superseded",
  previousPipelineStageId = lead.pipelineStageId,
) {
  return {
    actorId: context.actor.id,
    actorKind: context.actor.kind,
    channel: session.channel,
    commandId: input.commandId,
    leadId: lead.id,
    lossNote: input.outcome === "lost" ? input.note?.trim() || null : null,
    lossReason: input.outcome === "lost" ? input.reason : null,
    nextPipelineStageId: lead.pipelineStageId,
    originSessionId: session.id,
    outcome: input.outcome,
    previousPipelineStageId,
    requestFingerprint,
    result,
    saleId: null,
    storeId: lead.storeId,
    tenantId: lead.tenantId,
  } as const;
}

export async function recordConclusionOutcomeAudit(
  context: ServiceContext,
  outcome: CrmLeadOutcome,
  result: ConcludeWhatsappAttendanceResult["result"],
) {
  await context.audit.record({
    action: "crm.lead.outcome.apply",
    actor: context.actor,
    category: "data_change",
    entityId: outcome.id,
    entityType: "crm_lead_outcome",
    metadata: {
      commandId: outcome.commandId,
      leadId: outcome.leadId,
      outcome: outcome.outcome,
      permission: "crm.whatsapp.close",
      result,
    },
    outcome: "succeeded",
    requestId: context.requestId,
    storeId: outcome.storeId,
    tenantId: outcome.tenantId,
    summary: "Applied CRM lead outcome",
  });
}
