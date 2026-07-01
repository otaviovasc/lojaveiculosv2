import { assertPermission } from "../../../../shared/authorization.js";
import { createServiceLogMetadata } from "../../../../shared/serviceContext.js";
import type { ServiceContext } from "../../../../shared/serviceContext.js";
import type { CrmLead } from "../../ports/crmRepository.js";
import {
  CrmLeadNotFoundError,
  getCrmRepository,
  requireCrmScope,
  type CrmServicePorts,
} from "./serviceSupport.js";

const permission = "lead.read";

export type GetCrmLeadInput = {
  leadId: string;
};

export async function getCrmLead(
  context: ServiceContext,
  input: GetCrmLeadInput,
  ports: CrmServicePorts,
): Promise<CrmLead> {
  assertPermission(context, permission);
  const scope = requireCrmScope(context);

  context.logger.info(
    "crm.lead.get.started",
    createServiceLogMetadata(context, { leadId: input.leadId }),
  );

  const lead = await getCrmRepository(ports).findLeadById({
    leadId: input.leadId,
    storeId: scope.storeId as never,
    tenantId: scope.tenantId as never,
  });

  if (!lead) throw new CrmLeadNotFoundError(input.leadId);

  await context.audit.record({
    action: "crm.lead.get",
    actor: context.actor,
    category: "data_access",
    entityId: lead.id,
    entityType: "lead",
    metadata: { permission, status: lead.status },
    outcome: "succeeded",
    requestId: context.requestId,
    storeId: scope.storeId,
    tenantId: scope.tenantId,
    summary: "Read CRM lead",
  });

  return lead;
}
