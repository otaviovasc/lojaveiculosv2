import { assertPermission } from "../../../../shared/authorization.js";
import { createServiceLogMetadata } from "../../../../shared/serviceContext.js";
import type { ServiceContext } from "../../../../shared/serviceContext.js";
import {
  CrmPipelineNotFoundError,
  getCrmPipelineRepository,
  requireCrmScope,
  type CrmServicePorts,
} from "./serviceSupport.js";

const permission = "crm.pipeline.manage";

export type DeleteCrmPipelineInput = {
  pipelineId: string;
};

export async function deleteCrmPipeline(
  context: ServiceContext,
  input: DeleteCrmPipelineInput,
  ports: CrmServicePorts,
): Promise<{ deleted: true }> {
  assertPermission(context, permission);
  const scope = requireCrmScope(context);

  context.logger.info(
    "crm.pipeline.delete.started",
    createServiceLogMetadata(context, { pipelineId: input.pipelineId }),
  );

  const deleted = await getCrmPipelineRepository(ports).deletePipeline({
    pipelineId: input.pipelineId,
    storeId: scope.storeId as never,
    tenantId: scope.tenantId as never,
  });
  if (!deleted) throw new CrmPipelineNotFoundError(input.pipelineId);

  await context.audit.record({
    action: "crm.pipeline.delete",
    actor: context.actor,
    category: "data_change",
    entityId: input.pipelineId,
    entityType: "crm_pipeline",
    metadata: { permission },
    outcome: "succeeded",
    requestId: context.requestId,
    storeId: scope.storeId,
    tenantId: scope.tenantId,
    summary: "Deleted CRM pipeline",
  });

  return { deleted: true };
}
