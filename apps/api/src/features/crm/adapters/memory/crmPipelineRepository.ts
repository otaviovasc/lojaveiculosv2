import type {
  CreateCrmPipelineRepositoryInput,
  CrmPipeline,
  CrmPipelineRepository,
  CrmPipelineStage,
  UpdateCrmPipelineRepositoryInput,
} from "../../../../domains/crm/ports/crmPipelineRepository.js";

export function createMemoryCrmPipelineRepository(): CrmPipelineRepository {
  const pipelines: CrmPipeline[] = [];

  return {
    async createPipeline(input) {
      const pipeline = buildPipeline(input);
      pipelines.push(pipeline);
      return pipeline;
    },
    async deletePipeline(input) {
      const pipeline = findPipeline(pipelines, input.pipelineId, input);
      if (!pipeline) return false;
      pipelines.splice(pipelines.indexOf(pipeline), 1);
      return true;
    },
    async findPipelineById(input) {
      return findPipeline(pipelines, input.pipelineId, input) ?? null;
    },
    async findStageById(input) {
      return (
        pipelines
          .filter((pipeline) => matchesScope(pipeline, input))
          .flatMap((pipeline) => pipeline.stages)
          .find((stage) => stage.id === input.stageId) ?? null
      );
    },
    async listPipelines(input) {
      return pipelines
        .filter((pipeline) => matchesScope(pipeline, input))
        .sort(
          (left, right) => Number(right.isDefault) - Number(left.isDefault),
        );
    },
    async updatePipeline(input) {
      const pipeline = findPipeline(pipelines, input.pipelineId, input);
      if (!pipeline) return null;
      applyPipelineUpdate(pipeline, input);
      return pipeline;
    },
  };
}

function buildPipeline(input: CreateCrmPipelineRepositoryInput): CrmPipeline {
  const now = new Date();
  const id = crypto.randomUUID();
  return {
    createdAt: now,
    description: input.description ?? "",
    id,
    isDefault: input.isDefault ?? false,
    name: input.name,
    rotationActive: input.rotationActive ?? false,
    stages: input.stages.map((stage, index) =>
      buildStage(stage, id, input, now, index),
    ),
    storeId: input.storeId,
    tenantId: input.tenantId,
    updatedAt: now,
  };
}

function buildStage(
  input: CreateCrmPipelineRepositoryInput["stages"][number],
  pipelineId: string,
  scope: Pick<CreateCrmPipelineRepositoryInput, "storeId" | "tenantId">,
  now: Date,
  index: number,
): CrmPipelineStage {
  return {
    color: input.color,
    createdAt: now,
    id: input.id ?? crypto.randomUUID(),
    isSystem: input.isSystem ?? false,
    leadStatus: input.leadStatus,
    name: input.name,
    pipelineId,
    slaDays: input.slaDays ?? null,
    sortOrder: input.sortOrder ?? index,
    status: input.status,
    storeId: scope.storeId,
    tenantId: scope.tenantId,
    updatedAt: now,
  };
}

function applyPipelineUpdate(
  pipeline: CrmPipeline,
  input: UpdateCrmPipelineRepositoryInput,
) {
  const now = new Date();
  if (input.description !== undefined) pipeline.description = input.description;
  if (input.isDefault !== undefined) pipeline.isDefault = input.isDefault;
  if (input.name !== undefined) pipeline.name = input.name;
  if (input.rotationActive !== undefined) {
    pipeline.rotationActive = input.rotationActive;
  }
  if (input.stages) {
    pipeline.stages = input.stages.map((stage, index) =>
      buildStage(stage, pipeline.id, input, now, index),
    );
  }
  pipeline.updatedAt = now;
}

function findPipeline(
  pipelines: CrmPipeline[],
  pipelineId: string,
  scope: { storeId: string; tenantId: string },
) {
  return pipelines.find(
    (pipeline) => pipeline.id === pipelineId && matchesScope(pipeline, scope),
  );
}

function matchesScope(
  pipeline: Pick<CrmPipeline, "storeId" | "tenantId">,
  scope: { storeId: string; tenantId: string },
) {
  return (
    pipeline.storeId === scope.storeId && pipeline.tenantId === scope.tenantId
  );
}
