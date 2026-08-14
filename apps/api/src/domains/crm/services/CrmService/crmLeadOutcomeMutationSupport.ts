import type { ServiceContext } from "../../../../shared/serviceContext.js";
import { ensureCrmPipelineIntegrity } from "../../pipeline/ensureCrmPipelineIntegrity.js";
import type { CrmLead } from "../../ports/crmRepository.js";
import type { CrmWhatsappSession } from "../../ports/crmWhatsappRepository.js";
import type { CrmServicePorts } from "./types.js";
import {
  CrmLeadOutcomeCommandConflictError,
  CrmLeadOutcomeValidationError,
} from "./crmLeadOutcomeContracts.js";
import {
  getCrmRepository,
  getCrmWhatsappRepository,
} from "./serviceSupport.js";
import { hashCrmOutcome } from "./crmLeadOutcomePersistence.js";

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
  sessionId: string,
) {
  const [session] = await getCrmWhatsappRepository(ports).listSessions({
    limit: 1,
    offset: 0,
    sessionId,
    storeId: scope.storeId as never,
    tenantId: scope.tenantId as never,
  });
  if (!session)
    throw new CrmLeadOutcomeValidationError("WhatsApp session was not found.");
  return session;
}

export async function listActiveLeadSessions(
  ports: CrmServicePorts,
  scope: { storeId: string; tenantId: string },
  leadId: string,
) {
  const repository = getCrmWhatsappRepository(ports);
  const sessions: CrmWhatsappSession[] = [];
  const pageSize = 200;
  for (let offset = 0; ; offset += pageSize) {
    const page = await repository.listSessions({
      leadId,
      limit: pageSize,
      offset,
      storeId: scope.storeId as never,
      tenantId: scope.tenantId as never,
    });
    sessions.push(...page);
    if (page.length < pageSize) break;
  }
  return sessions.filter(isActiveSession);
}

export function isActiveSession(session: CrmWhatsappSession) {
  return session.status !== "COMPLETED" && session.status !== "EXPIRED";
}

export async function completeOutcomeSessions(
  ports: CrmServicePorts,
  scope: { storeId: string; tenantId: string },
  sessions: readonly CrmWhatsappSession[],
) {
  const repository = getCrmWhatsappRepository(ports);
  const changed: CrmWhatsappSession[] = [];
  for (const session of sessions) {
    let candidate = session;
    for (let attempt = 0; attempt < 3; attempt += 1) {
      if (!isActiveSession(candidate)) break;
      const updated = await repository.updateSession({
        assignedUserId: null,
        expectedRevision: candidate.revision,
        humanAttendanceChangedAt: null,
        humanAttendanceState: null,
        humanAttendanceStateVersion: null,
        humanHandlingStartedAt: null,
        humanTakeoverAt: null,
        interventionId: null,
        sessionId: candidate.id,
        status: "COMPLETED",
        storeId: scope.storeId as never,
        tenantId: scope.tenantId as never,
      });
      if (updated) {
        changed.push(updated);
        break;
      }
      candidate = await findOutcomeSession(ports, scope, candidate.id);
    }
    if (
      isActiveSession(candidate) &&
      !changed.some((row) => row.id === session.id)
    ) {
      throw new CrmLeadOutcomeCommandConflictError(
        "CRM attendance kept changing while its conclusion was being applied.",
      );
    }
  }
  return changed;
}

export async function createFollowUpTask(
  ports: CrmServicePorts,
  context: ServiceContext,
  scope: { storeId: string; tenantId: string },
  leadId: string,
  sessionId: string,
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
      sessionId,
    }),
    idempotencyKey: `crm-outcome:${commandId}:follow-up-task`,
    leadId,
    metadata: {
      task: {
        dueAt: dueAt.toISOString(),
        kind: "follow_up",
        originSessionId: sessionId,
      },
    },
    occurredAt: dueAt,
    storeId: scope.storeId as never,
    tenantId: scope.tenantId as never,
  });
}
