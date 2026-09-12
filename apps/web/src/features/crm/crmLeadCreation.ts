import type { ProductCrmApi } from "./productCrmApi";
import type { LeadCreateDraft } from "./crmPipelineModels";
import type { CreateProductCrmLeadInput } from "./productCrmTypes";

export async function createLeadWithInitialStage(
  api: ProductCrmApi,
  input: LeadCreateDraft,
) {
  return api.createLead(toCreateLeadInput(input));
}

function toCreateLeadInput(input: LeadCreateDraft): CreateProductCrmLeadInput {
  return {
    ...(input.birthDate !== undefined ? { birthDate: input.birthDate } : {}),
    ...(input.buyerEmail !== undefined ? { buyerEmail: input.buyerEmail } : {}),
    ...(input.buyerName !== undefined ? { buyerName: input.buyerName } : {}),
    ...(input.buyerPhone !== undefined ? { buyerPhone: input.buyerPhone } : {}),
    ...(input.listingId !== undefined ? { listingId: input.listingId } : {}),
    ...(input.metadata !== undefined ? { metadata: input.metadata } : {}),
    ...(input.initialPipelineStageId
      ? { pipelineStageId: input.initialPipelineStageId }
      : {}),
    source: input.source,
  };
}
