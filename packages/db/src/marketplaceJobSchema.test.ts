import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { getTableConfig, PgDialect } from "drizzle-orm/pg-core";
import { integrationJobs } from "./schema/integrations.js";

describe("marketplace job dispatch persistence", () => {
  it("replaces the job-status enum before later migrations use submitted", () => {
    const migration = readFileSync(
      new URL(
        "../migrations/0048_concerned_captain_flint.sql",
        import.meta.url,
      ),
      "utf8",
    );

    expect(migration).not.toContain("ADD VALUE 'submitted'");
    expect(migration).toContain(
      `CREATE TYPE "public"."integration_job_status" AS ENUM('queued', 'running', 'submitted', 'succeeded', 'failed', 'cancelled')`,
    );
    expect(migration).toContain(
      'USING "status"::text::"public"."integration_job_status"',
    );
    expect(migration).toContain(
      'DROP TYPE "public"."integration_job_status_legacy"',
    );
  });

  it("requires paired dispatch leases for running jobs and indexes recovery", () => {
    const config = getTableConfig(integrationJobs);
    const columns = new Map(
      config.columns.map((column) => [column.name, column]),
    );

    expect(columns.has("dispatch_lease_owner")).toBe(true);
    expect(columns.has("dispatch_lease_expires_at")).toBe(true);
    expect(config.indexes.map(({ config: index }) => index.name)).toContain(
      "integration_jobs_stale_dispatch_idx",
    );
    expect(config.checks.map(({ name }) => name)).toContain(
      "integration_jobs_dispatch_lease_consistent",
    );

    const dialect = new PgDialect();
    const check = config.checks.find(
      ({ name }) => name === "integration_jobs_dispatch_lease_consistent",
    );
    expect(check).toBeDefined();
    if (!check) throw new Error("Expected dispatch lease consistency check.");
    const sql = dialect.sqlToQuery(check.value).sql;
    expect(sql).toContain('"integration_jobs"."status" = \'running\'');
    expect(sql).toContain(
      '"integration_jobs"."dispatch_lease_owner" IS NOT NULL',
    );
  });

  it("migrates legacy running jobs to manual reconciliation before the check", () => {
    const migration = readFileSync(
      new URL("../migrations/0051_wild_blade.sql", import.meta.url),
      "utf8",
    );
    const recovery = migration.indexOf(
      `UPDATE "integration_jobs"\nSET "status" = 'submitted'`,
    );
    const constraint = migration.indexOf(
      'ADD CONSTRAINT "integration_jobs_dispatch_lease_consistent"',
    );

    expect(recovery).toBeGreaterThan(-1);
    expect(constraint).toBeGreaterThan(recovery);
    expect(migration).toContain('"reconciliation_next_attempt_at" = NULL');
    expect(migration).toContain("'dispatch_lease_migration'");
  });
});
