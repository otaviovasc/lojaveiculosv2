import { readFileSync } from "node:fs";
import { getTableConfig, PgDialect } from "drizzle-orm/pg-core";
import { describe, expect, it } from "vitest";
import { financeEntryLinks, vehicleCosts, vehicleUnits } from "./index.js";

const migrationSql = readFileSync(
  new URL("../migrations/0065_vehicle_cost_integrity.sql", import.meta.url),
  "utf8",
);

describe("vehicle cost persistence integrity", () => {
  it("models lifecycle and exact unit scope constraints", () => {
    const config = getTableConfig(vehicleCosts);
    const lifecycle = config.checks.find(
      ({ name }) => name === "vehicle_costs_status_void_fields_check",
    );
    const scope = config.foreignKeys.find(
      (key) => key.getName() === "vehicle_costs_unit_scope_fk",
    );

    expect(lifecycle).toBeDefined();
    const lifecycleSql = new PgDialect()
      .sqlToQuery(lifecycle?.value ?? fail("Missing lifecycle check"))
      .sql.toLowerCase();
    expect(lifecycleSql).toContain("active");
    expect(lifecycleSql).toContain("voided");
    expect(lifecycleSql).toContain("void_reason");
    expect(lifecycleSql).toContain('void_reason" is not null');
    expect(scope?.reference().columns.map(({ name }) => name)).toEqual([
      "unit_id",
      "tenant_id",
      "store_id",
    ]);
    expect(scope?.reference().foreignColumns.map(({ name }) => name)).toEqual([
      "id",
      "tenant_id",
      "store_id",
    ]);
    expect(
      getTableConfig(vehicleUnits).indexes.map(
        ({ config: index }) => index.name,
      ),
    ).toContain("vehicle_units_id_tenant_store_unique");
  });

  it("models one scoped finance link per vehicle cost", () => {
    const index = getTableConfig(financeEntryLinks).indexes.find(
      ({ config }) =>
        config.name === "finance_entry_links_vehicle_cost_target_unique",
    );

    expect(index?.config).toMatchObject({
      columns: [
        expect.objectContaining({ name: "tenant_id" }),
        expect.objectContaining({ name: "store_id" }),
        expect.objectContaining({ name: "target_id" }),
      ],
      unique: true,
    });
    const predicate = new PgDialect()
      .sqlToQuery(index?.config.where ?? fail("Missing partial index"))
      .sql.toLowerCase();
    expect(predicate).toContain("vehicle_cost");
  });

  it("fails closed on invalid scope and repairs duplicate links before indexing", () => {
    expect(migrationSql).toContain("Vehicle cost lifecycle integrity blocked");
    expect(migrationSql).toContain("Vehicle cost scope integrity blocked");
    expect(migrationSql).toContain(
      'ADD CONSTRAINT "vehicle_costs_unit_scope_fk"',
    );
    expect(migrationSql).toContain("ROW_NUMBER() OVER (");
    expect(migrationSql).toContain('DELETE FROM "finance_entry_links"');
    expect(migrationSql).toContain("vehicleCostDuplicateReconciliation");
    expect(migrationSql).toContain("canonicalEntryId");
    expect(migrationSql).not.toContain('DELETE FROM "finance_entries"');
    expect(
      migrationSql.indexOf('DELETE FROM "finance_entry_links"'),
    ).toBeLessThan(
      migrationSql.indexOf(
        'CREATE UNIQUE INDEX "finance_entry_links_vehicle_cost_target_unique"',
      ),
    );
  });
});

function fail(message: string): never {
  throw new Error(message);
}
