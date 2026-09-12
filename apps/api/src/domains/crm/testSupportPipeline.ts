import { randomUUID } from "node:crypto";
import type {
  CrmPipeline,
  CrmPipelineRepository,
} from "./ports/crmPipelineRepository.js";

export function createTestCrmPipelineRepository(): CrmPipelineRepository {
  const pipelines = new Map<string, CrmPipeline>();
  const repository = {
    async ensureDefaultPipeline(input) {
      const key = `${input.tenantId}:${input.storeId}`;
      const existing = pipelines.get(key);
      if (existing) return existing;
      const now = new Date();
      const pipelineId = randomUUID();
      const pipeline: CrmPipeline = {
        createdAt: now,
        description: "Test default pipeline",
        id: pipelineId,
        isDefault: true,
        name: "Pipeline padrão",
        rotationActive: false,
        stages: [
          {
            color: "#3b82f6",
            createdAt: now,
            id: randomUUID(),
            isSystem: true,
            leadStatus: "new",
            name: "Novo Lead",
            pipelineId,
            slaDays: 1,
            sortOrder: 0,
            status: "open",
            storeId: input.storeId,
            tenantId: input.tenantId,
            updatedAt: now,
          },
        ],
        storeId: input.storeId,
        tenantId: input.tenantId,
        updatedAt: now,
      };
      pipelines.set(key, pipeline);
      return pipeline;
    },
  } satisfies Pick<CrmPipelineRepository, "ensureDefaultPipeline">;
  return repository as CrmPipelineRepository;
}
