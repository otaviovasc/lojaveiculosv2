import { assertPermission } from "../../../../shared/authorization.js";
import { createServiceLogMetadata } from "../../../../shared/serviceContext.js";
import type { ServiceContext } from "../../../../shared/serviceContext.js";
import type { CrmLeadVisit } from "../../ports/crmVisitRepository.js";
import {
  getCrmRepository,
  getCrmVisitRepository,
  requireCrmScope,
  runCrmTransaction,
  type CrmServicePorts,
} from "./serviceSupport.js";
import {
  assertVisitSessionMatchesLead,
  findVisitLeadOrThrow,
  visitActivityMetadata,
} from "./leadVisitSupport.js";

const permission = "crm.visits.manage";

export type CreateLeadVisitInput = {
  assignedUserId?: string | null;
  leadId: string;
  notes?: string | null;
  scheduledAt: Date;
  sessionId?: string;
};

export async function createLeadVisit(
  context: ServiceContext,
  input: CreateLeadVisitInput,
  ports: CrmServicePorts,
): Promise<CrmLeadVisit> {
  assertPermission(context, permission);
  const scope = requireCrmScope(context);

  context.logger.info(
    "crm.visit.create.started",
    createServiceLogMetadata(context, {
      hasAssignedUser: Boolean(input.assignedUserId),
      hasSession: Boolean(input.sessionId),
      leadId: input.leadId,
      scheduledAt: input.scheduledAt.toISOString(),
    }),
  );

  const visit = await runCrmTransaction(ports, async (transactionPorts) => {
    await findVisitLeadOrThrow(context, input.leadId, transactionPorts);
    await assertVisitSessionMatchesLead(context, input, transactionPorts);
    const created = await getCrmVisitRepository(transactionPorts).createVisit({
      ...(input.assignedUserId !== undefined
        ? { assignedUserId: input.assignedUserId as never }
        : {}),
      leadId: input.leadId,
      ...(input.notes !== undefined ? { notes: input.notes } : {}),
      scheduledAt: input.scheduledAt,
      storeId: scope.storeId as never,
      tenantId: scope.tenantId as never,
    });
    await getCrmRepository(transactionPorts).createActivity({
      activityType: "task",
      content: `Visita agendada para ${created.scheduledAt.toISOString()}.`,
      createdByUserId:
        context.actor.kind === "user" ? (context.actor.id as never) : null,
      direction: "internal",
      leadId: created.leadId,
      metadata: visitActivityMetadata(created, {
        sessionId: input.sessionId ?? null,
      }),
      storeId: scope.storeId as never,
      tenantId: scope.tenantId as never,
    });
    return created;
  });

  await context.audit.record({
    action: "crm.visit.create",
    actor: context.actor,
    category: "data_change",
    entityId: visit.id,
    entityType: "lead_visit",
    metadata: { leadId: visit.leadId, permission },
    outcome: "succeeded",
    requestId: context.requestId,
    storeId: scope.storeId,
    tenantId: scope.tenantId,
    summary: "Created CRM lead visit",
  });

  return visit;
}
