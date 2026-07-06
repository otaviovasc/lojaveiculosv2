import { assertPermission } from "../../../../shared/authorization.js";
import { createServiceLogMetadata } from "../../../../shared/serviceContext.js";
import type { ServiceContext } from "../../../../shared/serviceContext.js";
import {
  normalizePipelineStages,
  type CrmPipelineStageDraft,
} from "../../pipeline/crmPipelineInputs.js";
import type { CrmPipeline } from "../../ports/crmPipelineRepository.js";
import { assertUniquePipelineName } from "../../pipeline/crmPipelineGuards.js";
import {
  getCrmPipelineRepository,
  requireCrmScope,
  runCrmTransaction,
  type CrmServicePorts,
} from "./serviceSupport.js";

const permission = "crm.pipeline.manage";

export type CreateCrmPipelineInput = {
  description?: string;
  isDefault?: boolean;
  name: string;
  rotationActive?: boolean;
  stages?: CrmPipelineStageDraft[];
};

export async function createCrmPipeline(
  context: ServiceContext,
  input: CreateCrmPipelineInput,
  ports: CrmServicePorts,
): Promise<CrmPipeline> {
  assertPermission(context, permission);
  const scope = requireCrmScope(context);

  context.logger.info(
    "crm.pipeline.create.started",
    createServiceLogMetadata(context, {
      stageCount: input.stages?.length ?? 0,
    }),
  );

  return runCrmTransaction(ports, async (transactionPorts) => {
    const repository = getCrmPipelineRepository(transactionPorts);
    await assertUniquePipelineName(repository, {
      name: input.name,
      storeId: scope.storeId as never,
      tenantId: scope.tenantId as never,
    });
    const pipeline = await repository.createPipeline({
      description: input.description ?? "",
      isDefault: input.isDefault ?? false,
      name: input.name,
      rotationActive: input.rotationActive ?? false,
      stages: normalizePipelineStages(input.stages),
      storeId: scope.storeId as never,
      tenantId: scope.tenantId as never,
    });
    await context.audit.record({
      action: "crm.pipeline.create",
      actor: context.actor,
      category: "data_change",
      entityId: pipeline.id,
      entityType: "crm_pipeline",
      metadata: { isDefault: pipeline.isDefault, permission },
      outcome: "succeeded",
      requestId: context.requestId,
      storeId: scope.storeId,
      tenantId: scope.tenantId,
      summary: "Created CRM pipeline",
    });
    return pipeline;
  });
}
