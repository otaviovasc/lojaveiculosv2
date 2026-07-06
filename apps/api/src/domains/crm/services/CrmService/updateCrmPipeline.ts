import { assertPermission } from "../../../../shared/authorization.js";
import { createServiceLogMetadata } from "../../../../shared/serviceContext.js";
import type { ServiceContext } from "../../../../shared/serviceContext.js";
import {
  normalizePipelineStages,
  type CrmPipelineStageDraft,
} from "../../pipeline/crmPipelineInputs.js";
import type { CrmPipeline } from "../../ports/crmPipelineRepository.js";
import {
  assertRemovedStagesUnused,
  assertUniquePipelineName,
} from "../../pipeline/crmPipelineGuards.js";
import {
  CrmPipelineNotFoundError,
  getCrmPipelineRepository,
  getCrmRepository,
  requireCrmScope,
  runCrmTransaction,
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

  return runCrmTransaction(ports, async (transactionPorts) => {
    const pipelineRepository = getCrmPipelineRepository(transactionPorts);
    const current = await pipelineRepository.findPipelineById({
      pipelineId: input.pipelineId,
      storeId: scope.storeId as never,
      tenantId: scope.tenantId as never,
    });
    if (!current) throw new CrmPipelineNotFoundError(input.pipelineId);
    if (input.name) {
      await assertUniquePipelineName(pipelineRepository, {
        exceptPipelineId: input.pipelineId,
        name: input.name,
        storeId: scope.storeId as never,
        tenantId: scope.tenantId as never,
      });
    }
    const stages = input.stages
      ? normalizePipelineStages(input.stages)
      : undefined;
    if (stages) {
      await assertRemovedStagesUnused(
        getCrmRepository(transactionPorts),
        current,
        {
          stageIds: stages.map((stage) => stage.id).filter(Boolean) as string[],
          storeId: scope.storeId as never,
          tenantId: scope.tenantId as never,
        },
      );
    }
    const pipeline = await pipelineRepository.updatePipeline({
      ...(input.description !== undefined
        ? { description: input.description }
        : {}),
      ...(input.isDefault !== undefined ? { isDefault: input.isDefault } : {}),
      ...(input.name !== undefined ? { name: input.name } : {}),
      pipelineId: input.pipelineId,
      ...(input.rotationActive !== undefined
        ? { rotationActive: input.rotationActive }
        : {}),
      ...(stages ? { stages } : {}),
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
  });
}
