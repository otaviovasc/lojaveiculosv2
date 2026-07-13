import { getTableConfig, PgDialect } from "drizzle-orm/pg-core";
import { describe, expect, it } from "vitest";
import { sales } from "./schema/sales.js";

describe("sales schema", () => {
  it("allows only one current non-cancelled sale per vehicle unit", () => {
    const index = getTableConfig(sales).indexes.find(
      ({ config }) => config.name === "sales_current_unit_unique",
    );

    expect(index?.config).toMatchObject({
      columns: [expect.objectContaining({ name: "unit_id" })],
      unique: true,
    });
    expect(index?.config.where).toBeDefined();

    const predicate = new PgDialect()
      .sqlToQuery(
        index?.config.where ?? fail("Missing partial index predicate"),
      )
      .sql.toLowerCase();
    expect(predicate).toContain('"sales"."unit_id" is not null');
    expect(predicate).toContain('"sales"."is_current_revision" = true');
    expect(predicate).toContain('"sales"."is_deleted" = false');
    expect(predicate).toContain('"sales"."deleted_at" is null');
    expect(predicate).toContain('"sales"."status" <> \'cancelled\'');
  });
});

function fail(message: string): never {
  throw new Error(message);
}
