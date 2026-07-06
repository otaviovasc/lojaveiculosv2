import { assertPermission } from "../../../../shared/authorization.js";
import { createServiceLogMetadata } from "../../../../shared/serviceContext.js";
import type { ServiceContext } from "../../../../shared/serviceContext.js";
import { assertPipelineCanBeDeleted } from "../../pipeline/crmPipelineGuards.js";
import {
  CrmPipelineNotFoundError,
  getCrmPipelineRepository,
  getCrmRepository,
  requireCrmScope,
  runCrmTransaction,
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

  return runCrmTransaction(ports, async (transactionPorts) => {
    await assertPipelineCanBeDeleted(getCrmRepository(transactionPorts), {
      pipelineId: input.pipelineId,
      storeId: scope.storeId as never,
      tenantId: scope.tenantId as never,
    });
    const deleted = await getCrmPipelineRepository(
      transactionPorts,
    ).deletePipeline({
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
  });
}
