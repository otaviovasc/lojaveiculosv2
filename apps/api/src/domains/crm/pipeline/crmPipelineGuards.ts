import type { StoreId, TenantId } from "@lojaveiculosv2/shared";
import type {
  CrmPipeline,
  CrmPipelineRepository,
} from "../ports/crmPipelineRepository.js";
import type { CrmRepository } from "../ports/crmRepository.js";
import {
  CrmPipelineDuplicateNameError,
  CrmPipelineInUseError,
} from "../services/CrmService/serviceSupport.js";

type PipelineScope = {
  storeId: StoreId;
  tenantId: TenantId;
};

export async function assertUniquePipelineName(
  repository: CrmPipelineRepository,
  input: PipelineScope & { exceptPipelineId?: string; name: string },
) {
  const existing = await repository.findPipelineByName(input);
  if (existing && existing.id !== input.exceptPipelineId) {
    throw new CrmPipelineDuplicateNameError(input.name);
  }
}

export async function assertPipelineCanBeDeleted(
  repository: CrmRepository,
  input: PipelineScope & { pipelineId: string },
) {
  const leadCount = await repository.countLeadsByPipeline(input);
  if (leadCount > 0) {
    throw new CrmPipelineInUseError(
      "CRM pipeline is in use by active leads and cannot be deleted.",
    );
  }
}

export async function assertRemovedStagesUnused(
  repository: CrmRepository,
  current: CrmPipeline,
  input: PipelineScope & { stageIds: string[] },
) {
  const nextIds = new Set(input.stageIds);
  const removedIds = current.stages
    .map((stage) => stage.id)
    .filter((stageId) => !nextIds.has(stageId));
  const leadCount = await repository.countLeadsByPipelineStages({
    stageIds: removedIds,
    storeId: input.storeId,
    tenantId: input.tenantId,
  });
  if (leadCount > 0) {
    throw new CrmPipelineInUseError(
      "CRM pipeline stage is in use by active leads and cannot be removed.",
    );
  }
}
