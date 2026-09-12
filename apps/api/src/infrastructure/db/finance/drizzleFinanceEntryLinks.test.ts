import type { SQL } from "drizzle-orm";
import { PgDialect } from "drizzle-orm/pg-core";
import { describe, expect, it } from "vitest";
import {
  findLinksForEntries,
  findTargetEntryIds,
} from "./drizzleFinanceEntryLinks.js";
import type { DrizzleFinanceClient } from "./drizzleFinanceRepository.js";

describe("drizzle finance entry link reads", () => {
  it("scopes entry-link hydration in SQL", async () => {
    const query = queryClient([{ entryId: "entry_1" }]);

    const rows = await findLinksForEntries(query.db, ["entry_1", "entry_2"], {
      storeId: "store_1",
      tenantId: "tenant_1",
    });

    expect(rows).toEqual([{ entryId: "entry_1" }]);
    expectQueryScope(query.where(), [
      "entry_1",
      "entry_2",
      "store_1",
      "tenant_1",
    ]);
    expect(sqlText(query.where())).toContain(
      '"finance_entry_links"."entry_id" in',
    );
  });

  it("scopes exact target lookup in SQL", async () => {
    const query = queryClient([{ entryId: "entry_7" }]);

    const result = await findTargetEntryIds(
      query.db,
      {
        limit: 100,
        offset: 0,
        storeId: "store_1",
        targetId: "unit_7",
        targetType: "vehicle_unit",
        tenantId: "tenant_1",
      },
      { storeId: "store_1", tenantId: "tenant_1" },
    );

    expect(result).toEqual(new Set(["entry_7"]));
    expectQueryScope(query.where(), [
      "store_1",
      "tenant_1",
      "unit_7",
      "vehicle_unit",
    ]);
    expect(sqlText(query.where())).toContain(
      '"finance_entry_links"."target_id"',
    );
    expect(sqlText(query.where())).toContain(
      '"finance_entry_links"."target_type"',
    );
  });
});

function queryClient(rows: readonly Record<string, unknown>[]) {
  let whereClause: SQL | undefined;
  const db = {
    select: () => ({
      from: () => ({
        where: async (where: SQL) => {
          whereClause = where;
          return rows;
        },
      }),
    }),
  } as unknown as DrizzleFinanceClient;
  return {
    db,
    where: () => whereClause ?? fail("Missing SQL where clause"),
  };
}

function expectQueryScope(where: SQL, expectedParams: readonly string[]) {
  const query = new PgDialect().sqlToQuery(where);
  expect(query.params).toEqual(expectedParams);
  expect(query.sql).toContain('"finance_entry_links"."store_id"');
  expect(query.sql).toContain('"finance_entry_links"."tenant_id"');
}

function sqlText(where: SQL) {
  return new PgDialect().sqlToQuery(where).sql;
}

function fail(message: string): never {
  throw new Error(message);
}
