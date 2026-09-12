import { readFileSync } from "node:fs";
import { getTableConfig } from "drizzle-orm/pg-core";
import { describe, expect, it } from "vitest";
import { leads } from "./index.js";

const migrationSql = readFileSync(
  new URL("../migrations/0027_crm_olx_lead_identity.sql", import.meta.url),
  "utf8",
);

describe("CRM OLX lead identity schema", () => {
  it("persists a bounded provider identity with a scoped unique index", () => {
    const config = getTableConfig(leads);
    const identityColumn = config.columns.find(
      (column) => column.name === "source_identity_key",
    );

    expect(identityColumn).toMatchObject({ columnType: "PgVarchar" });
    expect(config.indexes.map((index) => index.config.name)).toContain(
      "leads_source_identity_unique",
    );
    expect(migrationSql).toContain(
      'ON "leads" USING btree ("tenant_id","store_id","source","source_identity_key")',
    );
    expect(migrationSql).toContain(
      'WHERE "source_identity_key" IS NOT NULL AND "is_deleted" = false',
    );
  });
});
