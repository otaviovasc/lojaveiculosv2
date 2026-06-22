import { assertPermission } from "../../../../shared/authorization.js";
import { createServiceLogMetadata } from "../../../../shared/serviceContext.js";
import type { ServiceContext } from "../../../../shared/serviceContext.js";
import type {
  CrmLead,
  LeadSource,
  LeadStatus,
} from "../../ports/crmRepository.js";
import {
  getCrmRepository,
  requireCrmScope,
  type CrmServicePorts,
} from "./serviceSupport.js";

const permission = "lead.read";

export type ListCrmLeadsInput = {
  listingId?: string;
  limit?: number;
  search?: string;
  source?: LeadSource;
  status?: LeadStatus;
};

export async function listCrmLeads(
  context: ServiceContext,
  input: ListCrmLeadsInput,
  ports: CrmServicePorts,
): Promise<readonly CrmLead[]> {
  assertPermission(context, permission);
  const scope = requireCrmScope(context);
  const limit = input.limit ?? 50;

  context.logger.info(
    "crm.leads.list.started",
    createServiceLogMetadata(context, {
      limit,
      listingId: input.listingId ?? null,
      search: input.search ?? null,
      source: input.source ?? null,
      status: input.status ?? null,
    }),
  );

  const leads = await getCrmRepository(ports).listLeads({
    ...(input.listingId ? { listingId: input.listingId } : {}),
    ...(input.search ? { search: input.search } : {}),
    ...(input.source ? { source: input.source } : {}),
    ...(input.status ? { status: input.status } : {}),
    limit,
    storeId: scope.storeId as never,
    tenantId: scope.tenantId as never,
  });

  await context.audit.record({
    action: "crm.leads.list",
    actor: context.actor,
    category: "data_access",
    entityId: scope.storeId,
    entityType: "store",
    metadata: { leadCount: leads.length, permission },
    outcome: "succeeded",
    requestId: context.requestId,
    storeId: scope.storeId,
    tenantId: scope.tenantId,
    summary: "Listed CRM leads",
  });

  return leads;
}
