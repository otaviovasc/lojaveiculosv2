import { assertPermission } from "../../../../shared/authorization.js";
import { createServiceLogMetadata } from "../../../../shared/serviceContext.js";
import type { ServiceContext } from "../../../../shared/serviceContext.js";
import type { CrmLead } from "../../ports/crmRepository.js";
import {
  CrmLeadNotFoundError,
  CrmPipelineStageNotFoundError,
  getCrmPipelineRepository,
  getCrmRepository,
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
    const repository = getCrmRepository(transactionPorts);
    const pipelineRepository = getCrmPipelineRepository(transactionPorts);
    const lead = await repository.findLeadById({
      leadId: input.leadId,
      storeId: scope.storeId as never,
      tenantId: scope.tenantId as never,
    });
    if (!lead) throw new CrmLeadNotFoundError(input.leadId);

    const stage = await pipelineRepository.findStageById({
      stageId: input.pipelineStageId,
      storeId: scope.storeId as never,
      tenantId: scope.tenantId as never,
    });
    if (!stage) throw new CrmPipelineStageNotFoundError(input.pipelineStageId);

    const updated = await repository.updateLead({
      leadId: lead.id,
      pipelineId: stage.pipelineId,
      pipelineStageId: stage.id,
      status: stage.leadStatus,
      storeId: scope.storeId as never,
      tenantId: scope.tenantId as never,
    });

    await repository.createActivity({
      activityType: "status_change",
      content: `Alterou a etapa para "${stage.name}"`,
      createdByUserId:
        context.actor.kind === "user" ? (context.actor.id as never) : null,
      leadId: lead.id,
      metadata: {
        nextPipelineId: stage.pipelineId,
        nextStageId: stage.id,
        previousPipelineId: lead.pipelineId,
        previousStageId: lead.pipelineStageId,
      },
      storeId: scope.storeId as never,
      tenantId: scope.tenantId as never,
    });

    await context.audit.record({
      action: "crm.pipeline.lead_move",
      actor: context.actor,
      category: "data_change",
      entityId: lead.id,
      entityType: "lead",
      metadata: {
        nextPipelineId: stage.pipelineId,
        nextStageId: stage.id,
        permission,
        previousPipelineId: lead.pipelineId,
        previousStageId: lead.pipelineStageId,
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
