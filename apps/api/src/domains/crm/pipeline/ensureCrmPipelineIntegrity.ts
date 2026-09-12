import type { StoreId, TenantId } from "@lojaveiculosv2/shared";
import type {
  CrmPipeline,
  CrmPipelineStageStatus,
} from "../ports/crmPipelineRepository.js";
import type { CrmServicePorts } from "../services/CrmService/types.js";
import { getCrmPipelineRepository } from "../services/CrmService/serviceSupport.js";

const requiredStages: Record<
  CrmPipelineStageStatus,
  { color: string; leadStatus: "negotiating" | "won" | "lost"; name: string }
> = {
  open: { color: "#3b82f6", leadStatus: "negotiating", name: "Em negociação" },
  won: { color: "#22c55e", leadStatus: "won", name: "Ganho" },
  lost: { color: "#ef4444", leadStatus: "lost", name: "Perdido" },
};

export async function ensureCrmPipelineIntegrity(
  ports: CrmServicePorts,
  scope: { storeId: StoreId; tenantId: TenantId },
  pipelineId?: string | null,
): Promise<CrmPipeline> {
  const repository = getCrmPipelineRepository(ports);
  let pipeline = pipelineId
    ? await repository.findPipelineById({ ...scope, pipelineId })
    : null;
  pipeline ??= await repository.ensureDefaultPipeline(scope);

  const missing = (["open", "won", "lost"] as const).filter(
    (status) => !pipeline!.stages.some((stage) => stage.status === status),
  );
  if (!missing.length) return pipeline;

  const updated = await repository.updatePipeline({
    pipelineId: pipeline.id,
    stages: [
      ...pipeline.stages.map((stage) => ({
        color: stage.color,
        id: stage.id,
        isSystem: stage.isSystem,
        leadStatus: stage.leadStatus,
        name: stage.name,
        slaDays: stage.slaDays,
        sortOrder: stage.sortOrder,
        status: stage.status,
      })),
      ...missing.map((status, offset) => ({
        ...requiredStages[status],
        isSystem: true,
        sortOrder: pipeline!.stages.length + offset,
        status,
      })),
    ],
    ...scope,
  });
  if (!updated) throw new Error("CRM pipeline integrity repair failed.");
  return updated;
}
