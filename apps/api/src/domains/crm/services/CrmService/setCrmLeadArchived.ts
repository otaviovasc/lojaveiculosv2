import { assertPermission } from "../../../../shared/authorization.js";
import { createServiceLogMetadata } from "../../../../shared/serviceContext.js";
import type { ServiceContext } from "../../../../shared/serviceContext.js";
import type { CrmLead } from "../../ports/crmRepository.js";
import {
  CrmLeadNotFoundError,
  getCrmRepository,
  getCrmWhatsappRepository,
  requireCrmScope,
  type CrmServicePorts,
} from "./serviceSupport.js";

const permission = "lead.update";

export async function setCrmLeadArchived(
  context: ServiceContext,
  input: { archived: boolean; leadId: string },
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
    input.archived ? "crm.lead.archive.started" : "crm.lead.restore.started",
    createServiceLogMetadata(context, {
      leadId: input.leadId,
      previousStatus: before.status,
    }),
  );
  if (input.archived) {
    const linkedSessions = await getCrmWhatsappRepository(ports).listSessions({
      leadId: input.leadId,
      limit: 1,
      offset: 0,
      storeId: scope.storeId as never,
      tenantId: scope.tenantId as never,
    });
    if (linkedSessions.length)
      throw new CrmLeadLinkedSessionError(input.leadId);
  }
  const lead = await repository.updateLead({
    leadId: input.leadId,
    metadata: input.archived
      ? { ...before.metadata, archivedPreviousStatus: before.status }
      : withoutArchivedPreviousStatus(before.metadata),
    status: input.archived ? "archived" : restoredStatus(before),
    storeId: scope.storeId as never,
    tenantId: scope.tenantId as never,
  });
  await context.audit.record({
    action: input.archived ? "crm.lead.archive" : "crm.lead.restore",
    actor: context.actor,
    category: "data_change",
    entityId: lead.id,
    entityType: "lead",
    metadata: {
      permission,
      previousStatus: before.status,
      status: lead.status,
    },
    outcome: "succeeded",
    requestId: context.requestId,
    storeId: scope.storeId,
    tenantId: scope.tenantId,
    summary: input.archived ? "Archived CRM lead" : "Restored CRM lead",
  });
  return lead;
}

function restoredStatus(lead: CrmLead): CrmLead["status"] {
  const status = lead.metadata.archivedPreviousStatus;
  return status === "new" ||
    status === "contacted" ||
    status === "qualified" ||
    status === "negotiating" ||
    status === "won" ||
    status === "lost"
    ? status
    : "new";
}

function withoutArchivedPreviousStatus(metadata: Record<string, unknown>) {
  const { archivedPreviousStatus: _removed, ...rest } = metadata;
  return rest;
}

export class CrmLeadLinkedSessionError extends Error {
  constructor(leadId: string) {
    super(
      `CRM lead is linked to an attendance and cannot be archived: ${leadId}`,
    );
    this.name = "CrmLeadLinkedSessionError";
  }
}
