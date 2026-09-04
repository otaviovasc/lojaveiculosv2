import type { ServiceContext } from "../../../../shared/serviceContext.js";
import { ensureCrmPipelineIntegrity } from "../../pipeline/ensureCrmPipelineIntegrity.js";
import type { CrmLead } from "../../ports/crmRepository.js";
import type { CrmConversationCycle } from "../../ports/crmConversationRepository.js";
import type { CrmServicePorts } from "./types.js";
import {
  CrmLeadOutcomeCommandConflictError,
  CrmLeadOutcomeValidationError,
} from "./crmLeadOutcomeContracts.js";
import {
  getCrmRepository,
  getCrmConversationRepository,
} from "./serviceSupport.js";
import { hashCrmOutcome } from "./crmLeadOutcomePersistence.js";
import { resolveScopedConversationCycle } from "../CrmMessagingService/conversationCycleMutationSupport.js";

export async function moveLeadToOutcomeStage(
  ports: CrmServicePorts,
  scope: { storeId: string; tenantId: string },
  lead: CrmLead,
  status: "lost" | "won",
) {
  const pipeline = await ensureCrmPipelineIntegrity(
    ports,
    scope as never,
    lead.pipelineId,
  );
  const stage = pipeline.stages.find((item) => item.status === status);
  if (!stage)
    throw new Error(`CRM pipeline has no ${status} stage after repair.`);
  return getCrmRepository(ports).updateLead({
    leadId: lead.id,
    pipelineId: pipeline.id,
    pipelineStageId: stage.id,
    status,
    storeId: scope.storeId as never,
    tenantId: scope.tenantId as never,
  });
}

export async function findOutcomeSession(
  ports: CrmServicePorts,
  scope: { storeId: string; tenantId: string },
  cycleId: string,
) {
  const [conversationCycle] = await getCrmConversationRepository(
    ports,
  ).listConversationCycles({
    limit: 1,
    offset: 0,
    cycleId,
    storeId: scope.storeId as never,
    tenantId: scope.tenantId as never,
  });
  if (!conversationCycle)
    throw new CrmLeadOutcomeValidationError(
      "WhatsApp conversationCycle was not found.",
    );
  return conversationCycle;
}

export async function listActiveLeadSessions(
  ports: CrmServicePorts,
  scope: { storeId: string; tenantId: string },
  leadId: string,
) {
  const repository = getCrmConversationRepository(ports);
  const conversationCycles: CrmConversationCycle[] = [];
  const pageSize = 200;
  for (let offset = 0; ; offset += pageSize) {
    const page = await repository.listConversationCycles({
      leadId,
      limit: pageSize,
      offset,
      storeId: scope.storeId as never,
      tenantId: scope.tenantId as never,
    });
    conversationCycles.push(...page);
    if (page.length < pageSize) break;
  }
  return conversationCycles.filter(isActiveSession);
}

export function isActiveSession(conversationCycle: CrmConversationCycle) {
  return (
    conversationCycle.status !== "COMPLETED" &&
    conversationCycle.status !== "EXPIRED"
  );
}

export async function completeOutcomeSessions(
  ports: CrmServicePorts,
  scope: { storeId: string; tenantId: string },
  conversationCycles: readonly CrmConversationCycle[],
  context?: ServiceContext,
) {
  const repository = getCrmConversationRepository(ports);
  const changed: CrmConversationCycle[] = [];
  for (const conversationCycle of conversationCycles) {
    let candidate = conversationCycle;
    for (let attempt = 0; attempt < 3; attempt += 1) {
      if (!isActiveSession(candidate)) break;
      const updated = await repository.updateConversationCycle({
        assignedUserId: null,
        expectedRevision: candidate.revision,
        humanAttendanceChangedAt: null,
        humanAttendanceState: null,
        humanAttendanceStateVersion: null,
        humanHandlingStartedAt: null,
        humanTakeoverAt: null,
        interventionId: null,
        cycleId: candidate.id,
        status: "COMPLETED",
        storeId: scope.storeId as never,
        tenantId: scope.tenantId as never,
      });
      if (updated) {
        changed.push(updated);
        break;
      }
      candidate = context
        ? await findVisibleOutcomeSession(context, ports, candidate.id)
        : await findOutcomeSession(ports, scope, candidate.id);
    }
    if (
      isActiveSession(candidate) &&
      !changed.some((row) => row.id === conversationCycle.id)
    ) {
      throw new CrmLeadOutcomeCommandConflictError(
        "CRM attendance kept changing while its conclusion was being applied.",
      );
    }
  }
  return changed;
}

export async function findVisibleOutcomeSession(
  context: ServiceContext,
  ports: CrmServicePorts,
  cycleId: string,
) {
  const { conversationCycle } = await resolveScopedConversationCycle(
    context,
    { cycleId },
    ports,
  );
  if (!conversationCycle) {
    throw new CrmLeadOutcomeValidationError(
      "WhatsApp conversationCycle was not found.",
    );
  }
  return conversationCycle;
}

export async function createFollowUpTask(
  ports: CrmServicePorts,
  context: ServiceContext,
  scope: { storeId: string; tenantId: string },
  leadId: string,
  cycleId: string,
  commandId: string,
  dueAtValue: string,
) {
  const dueAt = new Date(dueAtValue);
  await getCrmRepository(ports).createActivityIdempotently({
    activityType: "task",
    content: "Retomar atendimento",
    createdByUserId:
      context.actor.kind === "user" ? (context.actor.id as never) : null,
    direction: "internal",
    idempotencyFingerprint: hashCrmOutcome({
      dueAt: dueAt.toISOString(),
      leadId,
      cycleId,
    }),
    idempotencyKey: `crm-outcome:${commandId}:follow-up-task`,
    leadId,
    metadata: {
      task: {
        dueAt: dueAt.toISOString(),
        kind: "follow_up",
        originSessionId: cycleId,
      },
    },
    occurredAt: dueAt,
    storeId: scope.storeId as never,
    tenantId: scope.tenantId as never,
  });
}
