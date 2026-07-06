import type { ProductCrmApi } from "./productCrmApi";
import type { LeadCreateDraft } from "./crmPipelineModels";
import type { CreateProductCrmLeadInput } from "./productCrmTypes";

export async function createLeadWithInitialStage(
  api: ProductCrmApi,
  input: LeadCreateDraft,
) {
  const lead = await api.createLead(toCreateLeadInput(input));
  if (!input.initialPipelineStageId) return lead;
  return api.moveLeadPipelineStage(lead.id, {
    pipelineStageId: input.initialPipelineStageId,
  });
}

function toCreateLeadInput(input: LeadCreateDraft): CreateProductCrmLeadInput {
  return {
    ...(input.buyerEmail !== undefined ? { buyerEmail: input.buyerEmail } : {}),
    ...(input.buyerName !== undefined ? { buyerName: input.buyerName } : {}),
    ...(input.buyerPhone !== undefined ? { buyerPhone: input.buyerPhone } : {}),
    ...(input.listingId !== undefined ? { listingId: input.listingId } : {}),
    ...(input.metadata !== undefined ? { metadata: input.metadata } : {}),
    source: input.source,
  };
}
