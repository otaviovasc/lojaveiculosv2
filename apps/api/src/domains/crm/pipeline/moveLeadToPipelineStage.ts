import type { ServiceContext } from "../../../shared/serviceContext.js";
import { CrmPipelineStageNotFoundError } from "../crmServiceDomainErrors.js";
import type { CrmLead } from "../ports/crmRepository.js";
import {
  getCrmPipelineRepository,
  getCrmRepository,
  type CrmServicePorts,
} from "../services/CrmService/serviceSupport.js";
import { CrmLeadNotFoundError } from "../services/CrmService/crmServiceErrors.js";

export type MoveLeadToPipelineStageInput = {
  leadId: string;
  pipelineStageId: string;
};

export type MoveLeadToPipelineStageResult = {
  previous: CrmLead;
  updated: CrmLead;
};

/**
 * Core lead stage move shared by the interactive pipeline move and campaign
 * stage transitions. Callers own permission checks and audit events.
 */
export async function moveLeadToPipelineStage(
  context: ServiceContext,
  ports: CrmServicePorts,
  scope: { storeId: string; tenantId: string },
  input: MoveLeadToPipelineStageInput,
): Promise<MoveLeadToPipelineStageResult> {
  const repository = getCrmRepository(ports);
  const pipelineRepository = getCrmPipelineRepository(ports);
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

  return { previous: lead, updated };
}
