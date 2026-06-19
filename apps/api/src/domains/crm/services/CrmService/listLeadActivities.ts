import { assertPermission } from "../../../../shared/authorization.js";
import { createServiceLogMetadata } from "../../../../shared/serviceContext.js";
import type { ServiceContext } from "../../../../shared/serviceContext.js";
import type { CrmLeadActivity } from "../../ports/crmRepository.js";
import {
  CrmLeadNotFoundError,
  getCrmRepository,
  requireCrmScope,
  type CrmServicePorts,
} from "./serviceSupport.js";

const permission = "lead.read";

export type ListLeadActivitiesInput = {
  leadId: string;
  limit?: number;
};

export async function listLeadActivities(
  context: ServiceContext,
  input: ListLeadActivitiesInput,
  ports: CrmServicePorts,
): Promise<readonly CrmLeadActivity[]> {
  assertPermission(context, permission);
  const scope = requireCrmScope(context);
  const repository = getCrmRepository(ports);
  const lead = await repository.findLeadById({
    leadId: input.leadId,
    storeId: scope.storeId as never,
    tenantId: scope.tenantId as never,
  });

  if (!lead) throw new CrmLeadNotFoundError(input.leadId);

  context.logger.info(
    "crm.lead.activities.list.started",
    createServiceLogMetadata(context, {
      leadId: input.leadId,
      limit: input.limit ?? 50,
    }),
  );

  const activities = await repository.listActivities({
    leadId: input.leadId,
    limit: input.limit ?? 50,
    storeId: scope.storeId as never,
    tenantId: scope.tenantId as never,
  });

  await context.audit.record({
    action: "crm.lead.activities.list",
    actor: context.actor,
    category: "data_access",
    entityId: input.leadId,
    entityType: "lead",
    metadata: { activityCount: activities.length, permission },
    outcome: "succeeded",
    requestId: context.requestId,
    storeId: scope.storeId,
    tenantId: scope.tenantId,
    summary: "Listed CRM lead activities",
  });

  return activities;
}
