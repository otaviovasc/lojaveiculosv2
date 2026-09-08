import { assertPermission } from "../../../../shared/authorization.js";
import { createServiceLogMetadata } from "../../../../shared/serviceContext.js";
import type { ServiceContext } from "../../../../shared/serviceContext.js";
import type { CrmLead } from "../../ports/crmRepository.js";
import { moveLeadToPipelineStage } from "../../pipeline/moveLeadToPipelineStage.js";
import {
  requireCrmScope,
  runCrmTransaction,
  type CrmServicePorts,
} from "./serviceSupport.js";

const permission = "crm.pipeline.move";

export type MoveCrmLeadPipelineStageInput = {
  leadId: string;
  pipelineStageId: string;
};

export async function moveCrmLeadPipelineStage(
  context: ServiceContext,
  input: MoveCrmLeadPipelineStageInput,
  ports: CrmServicePorts,
): Promise<CrmLead> {
  assertPermission(context, permission);
  const scope = requireCrmScope(context);

  context.logger.info(
    "crm.pipeline.lead_move.started",
    createServiceLogMetadata(context, {
      leadId: input.leadId,
      pipelineStageId: input.pipelineStageId,
    }),
  );

  return runCrmTransaction(ports, async (transactionPorts) => {
    const { previous, updated } = await moveLeadToPipelineStage(
      context,
      transactionPorts,
      scope,
      input,
    );

    await context.audit.record({
      action: "crm.pipeline.lead_move",
      actor: context.actor,
      category: "data_change",
      entityId: updated.id,
      entityType: "lead",
      metadata: {
        nextPipelineId: updated.pipelineId,
        nextStageId: updated.pipelineStageId,
        permission,
        previousPipelineId: previous.pipelineId,
        previousStageId: previous.pipelineStageId,
      },
      outcome: "succeeded",
      requestId: context.requestId,
      storeId: scope.storeId,
      tenantId: scope.tenantId,
      summary: "Moved CRM lead pipeline stage",
    });

    return updated;
  });
}
