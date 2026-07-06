import { assertPermission } from "../../../../shared/authorization.js";
import { createServiceLogMetadata } from "../../../../shared/serviceContext.js";
import type { ServiceContext } from "../../../../shared/serviceContext.js";
import type {
  CrmLeadVisit,
  LeadVisitStatus,
} from "../../ports/crmVisitRepository.js";
import {
  CrmVisitNotFoundError,
  getCrmRepository,
  getCrmVisitRepository,
  requireCrmScope,
  runCrmTransaction,
  type CrmServicePorts,
} from "./serviceSupport.js";
import { visitActivityMetadata } from "./leadVisitSupport.js";

const permission = "crm.visits.manage";

export type ChangeLeadVisitStatusInput = {
  status: Extract<LeadVisitStatus, "cancelled" | "completed">;
  visitId: string;
};

export async function changeLeadVisitStatus(
  context: ServiceContext,
  input: ChangeLeadVisitStatusInput,
  ports: CrmServicePorts,
): Promise<CrmLeadVisit> {
  assertPermission(context, permission);
  const scope = requireCrmScope(context);

  context.logger.info(
    "crm.visit.status_change.started",
    createServiceLogMetadata(context, {
      status: input.status,
      visitId: input.visitId,
    }),
  );

  const visit = await runCrmTransaction(ports, async (transactionPorts) => {
    const before = await getCrmVisitRepository(transactionPorts).findVisitById({
      storeId: scope.storeId as never,
      tenantId: scope.tenantId as never,
      visitId: input.visitId,
    });
    if (!before) throw new CrmVisitNotFoundError(input.visitId);
    const updated = await getCrmVisitRepository(transactionPorts).updateVisit({
      status: input.status,
      storeId: scope.storeId as never,
      tenantId: scope.tenantId as never,
      visitId: input.visitId,
    });
    if (!updated) throw new CrmVisitNotFoundError(input.visitId);
    await getCrmRepository(transactionPorts).createActivity({
      activityType: "status_change",
      content:
        input.status === "completed"
          ? "Visita concluida."
          : "Visita cancelada.",
      createdByUserId:
        context.actor.kind === "user" ? (context.actor.id as never) : null,
      direction: "internal",
      leadId: updated.leadId,
      metadata: visitActivityMetadata(updated, {
        previousStatus: before.status,
      }),
      storeId: scope.storeId as never,
      tenantId: scope.tenantId as never,
    });
    return updated;
  });

  await context.audit.record({
    action:
      input.status === "completed" ? "crm.visit.complete" : "crm.visit.cancel",
    actor: context.actor,
    category: "data_change",
    entityId: visit.id,
    entityType: "lead_visit",
    metadata: { leadId: visit.leadId, permission, status: visit.status },
    outcome: "succeeded",
    requestId: context.requestId,
    storeId: scope.storeId,
    tenantId: scope.tenantId,
    summary:
      input.status === "completed"
        ? "Completed CRM lead visit"
        : "Cancelled CRM lead visit",
  });

  return visit;
}
