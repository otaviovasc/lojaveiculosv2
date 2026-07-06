import { assertPermission } from "../../../../shared/authorization.js";
import { createServiceLogMetadata } from "../../../../shared/serviceContext.js";
import type { ServiceContext } from "../../../../shared/serviceContext.js";
import {
  normalizePipelineStages,
  type CrmPipelineStageDraft,
} from "../../pipeline/crmPipelineInputs.js";
import type { CrmPipeline } from "../../ports/crmPipelineRepository.js";
import {
  CrmPipelineNotFoundError,
  getCrmPipelineRepository,
  requireCrmScope,
  type CrmServicePorts,
} from "./serviceSupport.js";

const permission = "crm.pipeline.manage";

export type UpdateCrmPipelineInput = {
  description?: string;
  isDefault?: boolean;
  name?: string;
  pipelineId: string;
  rotationActive?: boolean;
  stages?: CrmPipelineStageDraft[];
};

export async function updateCrmPipeline(
  context: ServiceContext,
  input: UpdateCrmPipelineInput,
  ports: CrmServicePorts,
): Promise<CrmPipeline> {
  assertPermission(context, permission);
  const scope = requireCrmScope(context);

  context.logger.info(
    "crm.pipeline.update.started",
    createServiceLogMetadata(context, { pipelineId: input.pipelineId }),
  );

  const pipeline = await getCrmPipelineRepository(ports).updatePipeline({
    ...(input.description !== undefined
      ? { description: input.description }
      : {}),
    ...(input.isDefault !== undefined ? { isDefault: input.isDefault } : {}),
    ...(input.name !== undefined ? { name: input.name } : {}),
    pipelineId: input.pipelineId,
    ...(input.rotationActive !== undefined
      ? { rotationActive: input.rotationActive }
      : {}),
    ...(input.stages ? { stages: normalizePipelineStages(input.stages) } : {}),
    storeId: scope.storeId as never,
    tenantId: scope.tenantId as never,
  });
  if (!pipeline) throw new CrmPipelineNotFoundError(input.pipelineId);

  await context.audit.record({
    action: "crm.pipeline.update",
    actor: context.actor,
    category: "data_change",
    entityId: pipeline.id,
    entityType: "crm_pipeline",
    metadata: { permission, stageCount: pipeline.stages.length },
    outcome: "succeeded",
    requestId: context.requestId,
    storeId: scope.storeId,
    tenantId: scope.tenantId,
    summary: "Updated CRM pipeline",
  });

  return pipeline;
}
