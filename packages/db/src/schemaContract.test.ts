import { is } from "drizzle-orm";
import { getTableConfig, PgTable } from "drizzle-orm/pg-core";
import { describe, expect, it } from "vitest";
import * as schema from "./index.js";

const tables = Object.entries(schema).flatMap(([exportName, value]) =>
  is(value, PgTable) ? [{ config: getTableConfig(value), exportName }] : [],
);

describe("product database schema contract", () => {
  it("exports a substantial, uniquely named lower_snake_case schema", () => {
    const names = tables.map(({ config }) => config.name);

    expect(tables.length).toBeGreaterThan(80);
    expect(new Set(names).size).toBe(names.length);
    for (const name of names) expect(name).toMatch(/^[a-z][a-z0-9_]*$/);
  });

  it("keeps lifecycle columns on every application table", () => {
    for (const { config, exportName } of tables) {
      const columns = new Map(
        config.columns.map((column) => [column.name, column]),
      );
      const id = columns.get("id");
      const createdAt = columns.get("created_at");
      const updatedAt = columns.get("updated_at");

      expect(id, `${exportName} must expose id`).toMatchObject({
        hasDefault: true,
        notNull: true,
        primary: true,
      });
      expect(createdAt, `${exportName} must expose created_at`).toMatchObject({
        hasDefault: true,
        notNull: true,
      });
      expect(updatedAt, `${exportName} must expose updated_at`).toMatchObject({
        hasDefault: true,
        notNull: true,
      });
    }
  });

  it("keeps every SQL column unique and lower_snake_case", () => {
    for (const { config, exportName } of tables) {
      const names = config.columns.map(({ name }) => name);
      expect(new Set(names).size, `${exportName} has duplicate columns`).toBe(
        names.length,
      );
      for (const name of names) expect(name).toMatch(/^[a-z][a-z0-9_]*$/);
    }
  });

  it("publishes the canonical database naming policy", () => {
    expect(schema.databaseNamingPolicy).toEqual({
      columnCase: "lower_snake_case",
      idPolicy: "uuid_primary_key_default_random",
      language: "english",
      tableCase: "lower_snake_case",
      timestampPolicy: "created_at_updated_at_with_timezone",
    });
  });
});
