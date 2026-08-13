import { readFileSync } from "node:fs";
import { getTableConfig } from "drizzle-orm/pg-core";
import { describe, expect, it } from "vitest";
import { crmPipelines, leads } from "./index.js";

const migrationSql = readFileSync(
  new URL("../migrations/0045_chubby_mercury.sql", import.meta.url),
  "utf8",
);

describe("CRM lead pipeline invariant", () => {
  it("requires every lead to belong to a pipeline and stage", () => {
    const columns = new Map(
      getTableConfig(leads).columns.map((column) => [column.name, column]),
    );

    expect(columns.get("pipeline_id")?.notNull).toBe(true);
    expect(columns.get("pipeline_stage_id")?.notNull).toBe(true);
  });

  it("allows only one active default pipeline per CRM scope", () => {
    expect(
      getTableConfig(crmPipelines).indexes.map((index) => index.config.name),
    ).toContain("crm_pipelines_scope_default_unique");
  });

  it("backfills pipeline placement before applying non-null constraints", () => {
    const pipelineBackfill = migrationSql.indexOf(
      'UPDATE "leads" AS "lead"\nSET\n  "pipeline_id"',
    );
    const stageBackfill = migrationSql.indexOf(
      'UPDATE "leads" AS "lead"\nSET\n  "pipeline_stage_id"',
    );
    const pipelineConstraint = migrationSql.indexOf(
      'ALTER TABLE "leads" ALTER COLUMN "pipeline_id" SET NOT NULL',
    );
    const stageConstraint = migrationSql.indexOf(
      'ALTER TABLE "leads" ALTER COLUMN "pipeline_stage_id" SET NOT NULL',
    );

    expect(pipelineBackfill).toBeGreaterThanOrEqual(0);
    expect(stageBackfill).toBeGreaterThan(pipelineBackfill);
    expect(pipelineConstraint).toBeGreaterThan(stageBackfill);
    expect(stageConstraint).toBeGreaterThan(pipelineConstraint);
  });
});
