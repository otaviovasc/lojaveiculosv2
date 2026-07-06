import { assertPermission } from "../../../../shared/authorization.js";
import { createServiceLogMetadata } from "../../../../shared/serviceContext.js";
import type { ServiceContext } from "../../../../shared/serviceContext.js";
import type {
  CrmLeadVisit,
  LeadVisitStatus,
} from "../../ports/crmVisitRepository.js";
import {
  getCrmVisitRepository,
  requireCrmScope,
  type CrmServicePorts,
} from "./serviceSupport.js";
import { resolveVisitSessionLeadId } from "./leadVisitSupport.js";

const permission = "crm.visits.read";

export type ListLeadVisitsInput = {
  from?: Date;
  leadId?: string;
  limit: number;
  offset?: number;
  sessionId?: string;
  status?: LeadVisitStatus;
  to?: Date;
};

export async function listLeadVisits(
  context: ServiceContext,
  input: ListLeadVisitsInput,
  ports: CrmServicePorts,
): Promise<readonly CrmLeadVisit[]> {
  assertPermission(context, permission);
  const scope = requireCrmScope(context);
  const leadId = input.sessionId
    ? await resolveVisitSessionLeadId(context, input.sessionId, ports)
    : input.leadId;

  context.logger.info(
    "crm.visits.list.started",
    createServiceLogMetadata(context, {
      from: input.from?.toISOString() ?? null,
      leadId: leadId ?? null,
      limit: input.limit,
      offset: input.offset ?? 0,
      sessionId: input.sessionId ?? null,
      status: input.status ?? null,
      to: input.to?.toISOString() ?? null,
    }),
  );

  const visits = await getCrmVisitRepository(ports).listVisits({
    ...(input.from ? { from: input.from } : {}),
    ...(leadId ? { leadId } : {}),
    limit: input.limit,
    offset: input.offset ?? 0,
    ...(input.status ? { status: input.status } : {}),
    storeId: scope.storeId as never,
    tenantId: scope.tenantId as never,
    ...(input.to ? { to: input.to } : {}),
  });

  await context.audit.record({
    action: "crm.visit.list",
    actor: context.actor,
    category: "data_access",
    entityId: scope.storeId,
    entityType: "store",
    metadata: { leadId: leadId ?? null, permission, visitCount: visits.length },
    outcome: "succeeded",
    requestId: context.requestId,
    storeId: scope.storeId,
    tenantId: scope.tenantId,
    summary: "Listed CRM lead visits",
  });

  return visits;
}
