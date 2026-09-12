import { readFileSync } from "node:fs";
import { getTableConfig, PgDialect } from "drizzle-orm/pg-core";
import { describe, expect, it } from "vitest";
import { documentLinks } from "./schema/documents.js";
import { financeEntryLinks } from "./schema/finance.js";

const migrationSql = readFileSync(
  new URL(
    "../migrations/0064_finance_entry_receipt_uniqueness.sql",
    import.meta.url,
  ),
  "utf8",
);

describe("finance entry receipt uniqueness", () => {
  it("models one generated receipt link per scoped finance entry", () => {
    const index = getTableConfig(documentLinks).indexes.find(
      ({ config }) =>
        config.name === "document_links_finance_entry_receipt_unique",
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
    expect(predicate).toContain("finance_entry");
    expect(predicate).toContain("finance_entry_receipt");
  });

  it("archives duplicates with retained storage reconciliation before indexing", () => {
    expect(migrationSql).toContain("ROW_NUMBER() OVER (");
    expect(migrationSql).toContain('UPDATE "document_links"');
    expect(migrationSql).toContain("finance_entry_receipt_archived_duplicate");
    expect(migrationSql).toContain("receiptUniquenessReconciliation");
    expect(migrationSql).toContain("storageKeyRetained");
    expect(migrationSql).not.toContain('DELETE FROM "documents"');
    expect(migrationSql).toContain(
      'CREATE UNIQUE INDEX "document_links_finance_entry_receipt_unique"',
    );
    expect(migrationSql.indexOf('UPDATE "document_links"')).toBeLessThan(
      migrationSql.indexOf("CREATE UNIQUE INDEX"),
    );
  });

  it("indexes tenant/store-scoped finance link reads", () => {
    const indexes = getTableConfig(financeEntryLinks).indexes.map(
      ({ config }) => ({
        columns: config.columns.map((column) =>
          "name" in column ? column.name : null,
        ),
        name: config.name,
      }),
    );

    expect(indexes).toEqual(
      expect.arrayContaining([
        {
          columns: ["tenant_id", "store_id", "entry_id"],
          name: "finance_entry_links_scope_entry_idx",
        },
        {
          columns: [
            "tenant_id",
            "store_id",
            "target_type",
            "target_id",
            "entry_id",
          ],
          name: "finance_entry_links_scope_target_idx",
        },
      ]),
    );
    expect(migrationSql).toContain("finance_entry_links_scope_entry_idx");
    expect(migrationSql).toContain("finance_entry_links_scope_target_idx");
  });
});

function fail(message: string): never {
  throw new Error(message);
}
