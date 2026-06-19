import type { UserId } from "@lojaveiculosv2/shared";
import { assertPermission } from "../../../../shared/authorization.js";
import { createServiceLogMetadata } from "../../../../shared/serviceContext.js";
import type { ServiceContext } from "../../../../shared/serviceContext.js";
import type { CrmLead, LeadStatus } from "../../ports/crmRepository.js";
import {
  CrmLeadNotFoundError,
  getCrmRepository,
  requireCrmScope,
  type CrmServicePorts,
} from "./serviceSupport.js";

const permission = "lead.update";

export type UpdateCrmLeadInput = {
  assignedUserId?: string | null;
  buyerEmail?: string | null;
  buyerName?: string | null;
  buyerPhone?: string | null;
  leadId: string;
  metadata?: Record<string, unknown>;
  status?: LeadStatus;
};

export async function updateCrmLead(
  context: ServiceContext,
  input: UpdateCrmLeadInput,
  ports: CrmServicePorts,
): Promise<CrmLead> {
  assertPermission(context, permission);
  const scope = requireCrmScope(context);
  const repository = getCrmRepository(ports);
  const before = await repository.findLeadById({
    leadId: input.leadId,
    storeId: scope.storeId as never,
    tenantId: scope.tenantId as never,
  });

  if (!before) throw new CrmLeadNotFoundError(input.leadId);

  context.logger.info(
    "crm.lead.update.started",
    createServiceLogMetadata(context, {
      leadId: input.leadId,
      nextStatus: input.status ?? null,
      previousStatus: before.status,
    }),
  );

  const lead = await repository.updateLead({
    ...(input.assignedUserId !== undefined
      ? { assignedUserId: input.assignedUserId as UserId | null }
      : {}),
    ...(input.buyerEmail !== undefined ? { buyerEmail: input.buyerEmail } : {}),
    ...(input.buyerName !== undefined ? { buyerName: input.buyerName } : {}),
    ...(input.buyerPhone !== undefined ? { buyerPhone: input.buyerPhone } : {}),
    leadId: input.leadId,
    ...(input.metadata ? { metadata: input.metadata } : {}),
    ...(input.status ? { status: input.status } : {}),
    storeId: scope.storeId as never,
    tenantId: scope.tenantId as never,
  });

  await context.audit.record({
    action: "crm.lead.update",
    actor: context.actor,
    category: "data_change",
    entityId: lead.id,
    entityType: "lead",
    metadata: {
      changedFields: summarizeChangedFields(before, lead).join(","),
      permission,
      status: lead.status,
    },
    outcome: "succeeded",
    requestId: context.requestId,
    storeId: scope.storeId,
    tenantId: scope.tenantId,
    summary: "Updated CRM lead",
  });

  return lead;
}

function summarizeChangedFields(before: CrmLead, after: CrmLead) {
  return [
    ["assignedUserId", before.assignedUserId, after.assignedUserId],
    ["buyerEmail", before.buyerEmail, after.buyerEmail],
    ["buyerName", before.buyerName, after.buyerName],
    ["buyerPhone", before.buyerPhone, after.buyerPhone],
    ["status", before.status, after.status],
  ]
    .filter(([, previous, next]) => previous !== next)
    .map(([field]) => field);
}
