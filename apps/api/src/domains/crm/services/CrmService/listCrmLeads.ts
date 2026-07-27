import { assertPermission } from "../../../../shared/authorization.js";
import { createServiceLogMetadata } from "../../../../shared/serviceContext.js";
import type { ServiceContext } from "../../../../shared/serviceContext.js";
import type {
  CrmLeadCursor,
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
  cursor?: CrmLeadCursor;
  listingId?: string;
  limit?: number;
  offset?: number;
  pipelineId?: string;
  pipelineStageId?: string;
  search?: string;
  source?: LeadSource;
  status?: LeadStatus;
};

export type ListCrmLeadsResult = {
  items: readonly CrmLead[];
  nextCursor: CrmLeadCursor | null;
  total: number;
};

export async function listCrmLeads(
  context: ServiceContext,
  input: ListCrmLeadsInput,
  ports: CrmServicePorts,
): Promise<ListCrmLeadsResult> {
  assertPermission(context, permission);
  const scope = requireCrmScope(context);
  const limit = input.limit ?? 50;
  const offset = input.offset ?? 0;

  context.logger.info(
    "crm.leads.list.started",
    createServiceLogMetadata(context, {
      limit,
      listingId: input.listingId ?? null,
      offset,
      pipelineId: input.pipelineId ?? null,
      pipelineStageId: input.pipelineStageId ?? null,
      hasSearch: Boolean(input.search),
      searchLength: input.search?.length ?? 0,
      source: input.source ?? null,
      status: input.status ?? null,
    }),
  );

  const repository = getCrmRepository(ports);
  const filters = {
    ...(input.listingId ? { listingId: input.listingId } : {}),
    ...(input.pipelineId ? { pipelineId: input.pipelineId } : {}),
    ...(input.pipelineStageId
      ? { pipelineStageId: input.pipelineStageId }
      : {}),
    ...(input.search ? { search: input.search } : {}),
    ...(input.source ? { source: input.source } : {}),
    ...(input.status ? { status: input.status } : {}),
    storeId: scope.storeId as never,
    tenantId: scope.tenantId as never,
  };
  const [rows, total] = await Promise.all([
    repository.listLeads({
      ...filters,
      ...(input.cursor ? { cursor: input.cursor } : {}),
      limit: limit + 1,
      offset,
    }),
    repository.countLeads(filters),
  ]);
  const hasMore = rows.length > limit;
  const items = hasMore ? rows.slice(0, limit) : rows;
  const lastItem = items.at(-1);
  const nextCursor =
    hasMore && lastItem
      ? { id: lastItem.id, updatedAt: lastItem.updatedAt }
      : null;

  await context.audit.record({
    action: "crm.leads.list",
    actor: context.actor,
    category: "data_access",
    entityId: scope.storeId,
    entityType: "store",
    metadata: { leadCount: items.length, permission, total },
    outcome: "succeeded",
    requestId: context.requestId,
    storeId: scope.storeId,
    tenantId: scope.tenantId,
    summary: "Listed CRM leads",
  });

  return { items, nextCursor, total };
}
