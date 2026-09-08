import type { ServiceContext } from "../../../shared/serviceContext.js";
import { moveLeadToPipelineStage } from "../pipeline/moveLeadToPipelineStage.js";
import type {
  CrmCampaign,
  CrmCampaignRecipient,
} from "../ports/crmConversationRepository.js";
import type { CrmServicePorts } from "../services/CrmService/serviceSupport.js";

export type CampaignStageTransitionTrigger = "initial_send" | "reply";

/**
 * Moves the campaign recipient's lead to the stage configured on the campaign
 * and records the same lead-stage-move audit event as an interactive move.
 */
export async function applyCampaignStageTransition(
  context: ServiceContext,
  ports: CrmServicePorts,
  campaign: CrmCampaign,
  recipient: CrmCampaignRecipient,
  stageId: string | null,
  trigger: CampaignStageTransitionTrigger,
) {
  if (!stageId || !recipient.leadId) return;
  const scope = { storeId: campaign.storeId, tenantId: campaign.tenantId };
  const { previous, updated } = await moveLeadToPipelineStage(
    context,
    ports,
    scope,
    { leadId: recipient.leadId, pipelineStageId: stageId },
  );

  await context.audit.record({
    action: "crm.pipeline.lead_move",
    actor: context.actor,
    category: "data_change",
    entityId: updated.id,
    entityType: "lead",
    metadata: {
      campaignId: campaign.id,
      campaignRecipientId: recipient.id,
      nextPipelineId: updated.pipelineId,
      nextStageId: updated.pipelineStageId,
      previousPipelineId: previous.pipelineId,
      previousStageId: previous.pipelineStageId,
      trigger,
    },
    outcome: "succeeded",
    requestId: context.requestId,
    storeId: scope.storeId,
    tenantId: scope.tenantId,
    summary: "Moved CRM lead pipeline stage",
  });
}

/**
 * Best-effort variant for automated flows: a failed stage move must never
 * change the recorded outcome of the message send/reply that triggered it.
 * Failures are logged and audited, then swallowed.
 */
export async function tryCampaignStageTransition(
  context: ServiceContext,
  ports: CrmServicePorts,
  campaign: CrmCampaign,
  recipient: CrmCampaignRecipient,
  stageId: string | null,
  trigger: CampaignStageTransitionTrigger,
) {
  if (!stageId || !recipient.leadId) return;
  try {
    await applyCampaignStageTransition(
      context,
      ports,
      campaign,
      recipient,
      stageId,
      trigger,
    );
  } catch (error) {
    context.logger.warn("Campaign lead stage transition failed", {
      campaignId: campaign.id,
      campaignRecipientId: recipient.id,
      errorMessage: error instanceof Error ? error.message : String(error),
      leadId: recipient.leadId,
      stageId,
      storeId: campaign.storeId,
      tenantId: campaign.tenantId,
      trigger,
    });
    await context.audit.record({
      action: "crm.campaign.stage_transition",
      actor: context.actor,
      category: "data_change",
      entityId: recipient.leadId,
      entityType: "lead",
      metadata: {
        campaignId: campaign.id,
        campaignRecipientId: recipient.id,
        errorMessage: error instanceof Error ? error.message : String(error),
        stageId,
        trigger,
      },
      outcome: "failed",
      requestId: context.requestId,
      storeId: campaign.storeId,
      tenantId: campaign.tenantId,
      summary: "Failed to move CRM lead pipeline stage for campaign",
    });
  }
}
