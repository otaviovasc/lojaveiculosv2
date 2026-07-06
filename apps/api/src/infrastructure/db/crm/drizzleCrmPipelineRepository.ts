import { and, asc, eq, notInArray } from "drizzle-orm";
import { crmPipelineStages, crmPipelines } from "@lojaveiculosv2/db";
import type {
  CrmPipelineRepository,
  CrmPipelineStageInput,
} from "../../../domains/crm/ports/crmPipelineRepository.js";
import type { DrizzleCrmClient } from "./drizzleCrmRepository.js";
import {
  toCrmPipeline,
  toCrmPipelineStage,
} from "./drizzleCrmPipelineMappers.js";

export function createDrizzleCrmPipelineRepository(
  db: DrizzleCrmClient,
): CrmPipelineRepository {
  return {
    async createPipeline(input) {
      if (input.isDefault) await unsetDefaultPipelines(db, input.storeId);
      const [pipeline] = await db
        .insert(crmPipelines)
        .values({
          description: input.description ?? "",
          isDefault: input.isDefault ?? false,
          name: input.name,
          rotationActive: input.rotationActive ?? false,
          storeId: input.storeId,
          tenantId: input.tenantId,
        })
        .returning();
      if (!pipeline)
        throw new Error("Drizzle adapter did not return pipeline.");
      await insertStages(db, pipeline.id, input);
      return readPipeline(db, {
        pipelineId: pipeline.id,
        storeId: input.storeId,
        tenantId: input.tenantId,
      }).then(requirePipeline);
    },
    async deletePipeline(input) {
      const [pipeline] = await db
        .update(crmPipelines)
        .set({ deletedAt: new Date(), isDeleted: true, updatedAt: new Date() })
        .where(scopedPipeline(input))
        .returning();
      if (!pipeline) return false;
      await db
        .update(crmPipelineStages)
        .set({ deletedAt: new Date(), isDeleted: true, updatedAt: new Date() })
        .where(eq(crmPipelineStages.pipelineId, input.pipelineId));
      return true;
    },
    findPipelineById: (input) => readPipeline(db, input),
    async findStageById(input) {
      const [row] = await db
        .select()
        .from(crmPipelineStages)
        .where(scopedStage(input))
        .limit(1);
      return row ? toCrmPipelineStage(row) : null;
    },
    async listPipelines(input) {
      const rows = await db
        .select()
        .from(crmPipelines)
        .where(scopedPipeline(input))
        .orderBy(asc(crmPipelines.name));
      return Promise.all(rows.map((row) => readStagesForPipeline(db, row)));
    },
    async updatePipeline(input) {
      const current = await readPipeline(db, input);
      if (!current) return null;
      if (input.isDefault) await unsetDefaultPipelines(db, input.storeId);
      const [row] = await db
        .update(crmPipelines)
        .set({
          ...(input.description !== undefined
            ? { description: input.description }
            : {}),
          ...(input.isDefault !== undefined
            ? { isDefault: input.isDefault }
            : {}),
          ...(input.name !== undefined ? { name: input.name } : {}),
          ...(input.rotationActive !== undefined
            ? { rotationActive: input.rotationActive }
            : {}),
          updatedAt: new Date(),
        })
        .where(scopedPipeline(input))
        .returning();
      if (!row) return null;
      if (input.stages) {
        await replaceStages(db, { ...input, stages: input.stages });
      }
      return readPipeline(db, input);
    },
  };
}

async function readPipeline(
  db: DrizzleCrmClient,
  input: { pipelineId: string; storeId: string; tenantId: string },
) {
  const [row] = await db
    .select()
    .from(crmPipelines)
    .where(scopedPipeline(input))
    .limit(1);
  return row ? readStagesForPipeline(db, row) : null;
}

async function readStagesForPipeline(
  db: DrizzleCrmClient,
  row: typeof crmPipelines.$inferSelect,
) {
  const stages = await db
    .select()
    .from(crmPipelineStages)
    .where(
      and(
        eq(crmPipelineStages.pipelineId, row.id),
        eq(crmPipelineStages.isDeleted, false),
      ),
    )
    .orderBy(asc(crmPipelineStages.sortOrder));
  return toCrmPipeline(row, stages);
}

async function insertStages(
  db: DrizzleCrmClient,
  pipelineId: string,
  input: {
    stages: CrmPipelineStageInput[];
    storeId: string;
    tenantId: string;
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

async function replaceStages(
  db: DrizzleCrmClient,
  input: {
    pipelineId: string;
    stages: CrmPipelineStageInput[];
    storeId: string;
    tenantId: string;
  },
) {
  const ids = input.stages.map((stage) => stage.id).filter(Boolean) as string[];
  await softDeleteMissingStages(db, input, ids);
  for (const [index, stage] of input.stages.entries()) {
    if (stage.id && (await updateStage(db, input, stage, index))) continue;
    await insertStages(db, input.pipelineId, { ...input, stages: [stage] });
  }
}

async function softDeleteMissingStages(
  db: DrizzleCrmClient,
  input: { pipelineId: string; storeId: string; tenantId: string },
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
  input: { pipelineId: string; storeId: string; tenantId: string },
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

function scopedPipeline(input: {
  pipelineId?: string;
  storeId: string;
  tenantId: string;
}) {
  return and(
    ...(input.pipelineId ? [eq(crmPipelines.id, input.pipelineId)] : []),
    eq(crmPipelines.storeId, input.storeId),
    eq(crmPipelines.tenantId, input.tenantId),
    eq(crmPipelines.isDeleted, false),
  );
}

function scopedStage(input: {
  stageId: string;
  storeId: string;
  tenantId: string;
}) {
  return and(
    eq(crmPipelineStages.id, input.stageId),
    eq(crmPipelineStages.storeId, input.storeId),
    eq(crmPipelineStages.tenantId, input.tenantId),
    eq(crmPipelineStages.isDeleted, false),
  );
}

async function unsetDefaultPipelines(db: DrizzleCrmClient, storeId: string) {
  await db
    .update(crmPipelines)
    .set({ isDefault: false, updatedAt: new Date() })
    .where(eq(crmPipelines.storeId, storeId));
}

function requirePipeline<T>(pipeline: T | null): T {
  if (!pipeline) throw new Error("Drizzle adapter did not return pipeline.");
  return pipeline;
}
