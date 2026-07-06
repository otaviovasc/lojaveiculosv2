import { and, asc, eq } from "drizzle-orm";
import { crmPipelineStages, crmPipelines } from "@lojaveiculosv2/db";
import type { CrmPipelineRepository } from "../../../domains/crm/ports/crmPipelineRepository.js";
import type { DrizzleCrmClient } from "./drizzleCrmRepository.js";
import {
  toCrmPipeline,
  toCrmPipelineStage,
} from "./drizzleCrmPipelineMappers.js";
import {
  insertStages,
  replaceStages,
} from "./drizzleCrmPipelineStageWrites.js";

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
        .where(
          and(
            eq(crmPipelineStages.pipelineId, input.pipelineId),
            eq(crmPipelineStages.storeId, input.storeId),
            eq(crmPipelineStages.tenantId, input.tenantId),
          ),
        );
      return true;
    },
    findPipelineById: (input) => readPipeline(db, input),
    async findPipelineByName(input) {
      const [row] = await db
        .select()
        .from(crmPipelines)
        .where(scopedPipeline(input))
        .limit(1);
      return row ? readStagesForPipeline(db, row) : null;
    },
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

function scopedPipeline(input: {
  name?: string;
  pipelineId?: string;
  storeId: string;
  tenantId: string;
}) {
  return and(
    ...(input.name ? [eq(crmPipelines.name, input.name)] : []),
    ...(input.pipelineId ? [eq(crmPipelines.id, input.pipelineId)] : []),
    eq(crmPipelines.storeId, input.storeId),
    eq(crmPipelines.tenantId, input.tenantId),
    eq(crmPipelines.isDeleted, false),
  );
}

function scopedStage(input: {
  pipelineId?: string;
  stageId: string;
  storeId: string;
  tenantId: string;
}) {
  return and(
    ...(input.pipelineId
      ? [eq(crmPipelineStages.pipelineId, input.pipelineId)]
      : []),
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
