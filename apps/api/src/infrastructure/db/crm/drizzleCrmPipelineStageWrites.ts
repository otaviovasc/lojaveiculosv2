import { and, eq, notInArray } from "drizzle-orm";
import { crmPipelineStages } from "@lojaveiculosv2/db";
import type { CrmPipelineStageInput } from "../../../domains/crm/ports/crmPipelineRepository.js";
import type { DrizzleCrmClient } from "./drizzleCrmRepository.js";

type StageWriteScope = {
  pipelineId: string;
  storeId: string;
  tenantId: string;
};

export async function insertStages(
  db: DrizzleCrmClient,
  pipelineId: string,
  input: Omit<StageWriteScope, "pipelineId"> & {
    stages: CrmPipelineStageInput[];
  },
) {
  if (!input.stages.length) return;
  await db.insert(crmPipelineStages).values(
    input.stages.map((stage, index) => ({
      color: stage.color,
      ...(stage.id ? { id: stage.id } : {}),
      isSystem: stage.isSystem ?? false,
      leadStatus: stage.leadStatus,
      name: stage.name,
      pipelineId,
      slaDays: stage.slaDays ?? null,
      sortOrder: stage.sortOrder ?? index,
      status: stage.status,
      storeId: input.storeId,
      tenantId: input.tenantId,
    })),
  );
}

export async function replaceStages(
  db: DrizzleCrmClient,
  input: StageWriteScope & { stages: CrmPipelineStageInput[] },
) {
  const ids = input.stages.map((stage) => stage.id).filter(Boolean) as string[];
  await softDeleteMissingStages(db, input, ids);
  for (const [index, stage] of input.stages.entries()) {
    if (stage.id && (await updateStage(db, input, stage, index))) continue;
    await insertStages(db, input.pipelineId, { ...input, stages: [stage] });
  }
}

export function scopedStage(input: StageWriteScope & { stageId: string }) {
  return and(
    eq(crmPipelineStages.pipelineId, input.pipelineId),
    eq(crmPipelineStages.id, input.stageId),
    eq(crmPipelineStages.storeId, input.storeId),
    eq(crmPipelineStages.tenantId, input.tenantId),
    eq(crmPipelineStages.isDeleted, false),
  );
}

async function softDeleteMissingStages(
  db: DrizzleCrmClient,
  input: StageWriteScope,
  ids: string[],
) {
  await db
    .update(crmPipelineStages)
    .set({ deletedAt: new Date(), isDeleted: true, updatedAt: new Date() })
    .where(
      and(
        eq(crmPipelineStages.pipelineId, input.pipelineId),
        eq(crmPipelineStages.storeId, input.storeId),
        eq(crmPipelineStages.tenantId, input.tenantId),
        ...(ids.length ? [notInArray(crmPipelineStages.id, ids)] : []),
      ),
    );
}

async function updateStage(
  db: DrizzleCrmClient,
  input: StageWriteScope,
  stage: CrmPipelineStageInput,
  index: number,
) {
  const [row] = await db
    .update(crmPipelineStages)
    .set({
      color: stage.color,
      isSystem: stage.isSystem ?? false,
      leadStatus: stage.leadStatus,
      name: stage.name,
      slaDays: stage.slaDays ?? null,
      sortOrder: stage.sortOrder ?? index,
      status: stage.status,
      updatedAt: new Date(),
    })
    .where(scopedStage({ ...input, stageId: stage.id! }))
    .returning();
  return Boolean(row);
}
