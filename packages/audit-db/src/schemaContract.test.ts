import { is } from "drizzle-orm";
import { getTableConfig, PgTable } from "drizzle-orm/pg-core";
import { describe, expect, it } from "vitest";
import * as schema from "./index.js";

const tables = Object.entries(schema).flatMap(([exportName, value]) =>
  is(value, PgTable) ? [{ config: getTableConfig(value), exportName }] : [],
);

describe("audit database schema contract", () => {
  it("exports only uniquely named lower_snake_case tables", () => {
    const names = tables.map(({ config }) => config.name);

    expect(tables).toHaveLength(5);
    expect(new Set(names).size).toBe(names.length);
    for (const name of names) expect(name).toMatch(/^[a-z][a-z0-9_]*$/);
  });

  it("keeps lifecycle columns on every audit table", () => {
    for (const { config, exportName } of tables) {
      const columns = new Map(
        config.columns.map((column) => [column.name, column]),
      );

      expect(columns.get("id"), `${exportName} must expose id`).toMatchObject({
        hasDefault: true,
        notNull: true,
        primary: true,
      });
      expect(
        columns.get("created_at"),
        `${exportName} must expose created_at`,
      ).toMatchObject({ hasDefault: true, notNull: true });
      expect(
        columns.get("updated_at"),
        `${exportName} must expose updated_at`,
      ).toMatchObject({ hasDefault: true, notNull: true });
    }
  });

  it("publishes the separate-database write policy", () => {
    expect(schema.auditDatabasePolicy).toEqual({
      database: "separate_railway_postgres",
      retention: "domain_specific_retention_to_be_defined",
      tableCase: "lower_snake_case",
      writePath: "audit_sink_only",
    });
  });
});
