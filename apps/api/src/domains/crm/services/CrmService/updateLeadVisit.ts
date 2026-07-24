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
import {
  resolveVisitVehicleInterest,
  visitActivityMetadata,
} from "./leadVisitSupport.js";

const permission = "crm.visits.manage";

export type UpdateLeadVisitInput = {
  assignedUserId?: string | null;
  listingId?: string | null;
  notes?: string | null;
  scheduledAt?: Date;
  status?: Extract<LeadVisitStatus, "confirmed" | "no_show" | "scheduled">;
  visitId: string;
};

export async function updateLeadVisit(
  context: ServiceContext,
  input: UpdateLeadVisitInput,
  ports: CrmServicePorts,
): Promise<CrmLeadVisit> {
  assertPermission(context, permission);
  const scope = requireCrmScope(context);

  context.logger.info(
    "crm.visit.update.started",
    createServiceLogMetadata(context, {
      hasAssignedUser: input.assignedUserId !== undefined,
      hasVehicleInterestChange: input.listingId !== undefined,
      hasNotes: input.notes !== undefined,
      hasScheduledAt: Boolean(input.scheduledAt),
      status: input.status ?? null,
      visitId: input.visitId,
    }),
  );

  const vehicleInterest =
    input.listingId !== undefined
      ? await resolveVisitVehicleInterest(context, input.listingId, ports)
      : null;
  const visit = await runCrmTransaction(ports, async (transactionPorts) => {
    const before = await getCrmVisitRepository(transactionPorts).findVisitById({
      storeId: scope.storeId as never,
      tenantId: scope.tenantId as never,
      visitId: input.visitId,
    });
    if (!before) throw new CrmVisitNotFoundError(input.visitId);
    const updated = await getCrmVisitRepository(transactionPorts).updateVisit({
      ...(input.assignedUserId !== undefined
        ? { assignedUserId: input.assignedUserId as never }
        : {}),
      ...(input.notes !== undefined ? { notes: input.notes } : {}),
      ...(vehicleInterest
        ? {
            listingId: vehicleInterest.listingId,
            vehicleTitle: vehicleInterest.vehicleTitle,
          }
        : {}),
      ...(input.scheduledAt ? { scheduledAt: input.scheduledAt } : {}),
      ...(input.status ? { status: input.status } : {}),
      storeId: scope.storeId as never,
      tenantId: scope.tenantId as never,
      visitId: input.visitId,
    });
    if (!updated) throw new CrmVisitNotFoundError(input.visitId);
    await getCrmRepository(transactionPorts).createActivity({
      activityType: "task",
      content: `Visita atualizada para ${updated.scheduledAt.toISOString()}.`,
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
    action: "crm.visit.update",
    actor: context.actor,
    category: "data_change",
    entityId: visit.id,
    entityType: "lead_visit",
    metadata: { leadId: visit.leadId, permission, status: visit.status },
    outcome: "succeeded",
    requestId: context.requestId,
    storeId: scope.storeId,
    tenantId: scope.tenantId,
    summary: "Updated CRM lead visit",
  });

  return visit;
}
