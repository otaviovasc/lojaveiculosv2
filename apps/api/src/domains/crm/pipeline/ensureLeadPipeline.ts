import type { StoreId, TenantId } from "@lojaveiculosv2/shared";
import type { CrmServicePorts } from "../services/CrmService/types.js";
import { getCrmPipelineRepository } from "../services/CrmService/serviceSupport.js";

export async function ensureLeadPipeline(
  ports: CrmServicePorts,
  scope: { storeId: StoreId; tenantId: TenantId },
) {
  const pipeline =
    await getCrmPipelineRepository(ports).ensureDefaultPipeline(scope);
  const firstOpenStage = pipeline.stages.find(
    (stage) => stage.status === "open",
  );
  if (!firstOpenStage) {
    throw new Error("Default CRM pipeline must contain an open stage.");
  }
  return { pipelineId: pipeline.id, pipelineStageId: firstOpenStage.id };
}
