import { readFileSync } from "node:fs";
import { getTableConfig, PgDialect } from "drizzle-orm/pg-core";
import { describe, expect, it } from "vitest";
import { vehicleUnits } from "./schema/inventory.js";

const migrationSql = readFileSync(
  new URL("../migrations/0054_clever_bushwacker.sql", import.meta.url),
  "utf8",
);

describe("vehicle unit identifiers schema", () => {
  it("persists Renavam with a store-scoped active uniqueness contract", () => {
    const config = getTableConfig(vehicleUnits);
    const renavam = config.columns.find((column) => column.name === "renavam");
    const index = config.indexes.find(
      ({ config: indexConfig }) =>
        indexConfig.name === "vehicle_units_store_renavam_unique",
    );

    expect(renavam).toBeDefined();
    expect(index?.config).toMatchObject({
      columns: [
        expect.objectContaining({ name: "store_id" }),
        expect.objectContaining({ name: "renavam" }),
      ],
      unique: true,
    });

    const predicate = new PgDialect()
      .sqlToQuery(
        index?.config.where ?? fail("Missing partial index predicate"),
      )
      .sql.toLowerCase();
    expect(predicate).toContain('"is_deleted" = false');
    expect(predicate).toContain('"deleted_at" is null');
  });

  it("ships the Renavam column and uniqueness index in the migration", () => {
    expect(migrationSql).toContain(
      'ALTER TABLE "vehicle_units" ADD COLUMN "renavam" varchar(32)',
    );
    expect(migrationSql).toContain(
      'CREATE UNIQUE INDEX "vehicle_units_store_renavam_unique"',
    );
  });
});

function fail(message: string): never {
  throw new Error(message);
}
