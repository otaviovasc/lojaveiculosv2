import { assertPermission } from "../../../../shared/authorization.js";
import { createServiceLogMetadata } from "../../../../shared/serviceContext.js";
import type { ServiceContext } from "../../../../shared/serviceContext.js";
import type { CrmPipeline } from "../../ports/crmPipelineRepository.js";
import {
  getCrmPipelineRepository,
  requireCrmScope,
  type CrmServicePorts,
} from "./serviceSupport.js";

const permission = "crm.pipeline.read";

export async function listCrmPipelines(
  context: ServiceContext,
  ports: CrmServicePorts,
): Promise<readonly CrmPipeline[]> {
  assertPermission(context, permission);
  const scope = requireCrmScope(context);

  context.logger.info(
    "crm.pipeline.list.started",
    createServiceLogMetadata(context, {}),
  );

  const pipelines = await getCrmPipelineRepository(ports).listPipelines({
    storeId: scope.storeId as never,
    tenantId: scope.tenantId as never,
  });

  await context.audit.record({
    action: "crm.pipeline.list",
    actor: context.actor,
    category: "data_access",
    entityId: scope.storeId,
    entityType: "store",
    metadata: { permission, pipelineCount: pipelines.length },
    outcome: "succeeded",
    requestId: context.requestId,
    storeId: scope.storeId,
    tenantId: scope.tenantId,
    summary: "Listed CRM pipelines",
  });

  return pipelines;
}
