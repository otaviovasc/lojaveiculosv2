import { stores } from "@lojaveiculosv2/db";
import type { SQL } from "drizzle-orm";
import { PgDialect } from "drizzle-orm/pg-core";
import { describe, expect, it } from "vitest";
import { listActiveBillingStores } from "./drizzleBillingStoreDirectory.js";

describe("listActiveBillingStores", () => {
  it("returns more than 100 stores from an active tenant-scoped query", async () => {
    const capture: QueryCapture = {};
    const rows = Array.from({ length: 101 }, (_, index) => ({
      id: `store_${String(index + 1)}`,
    }));

    const result = await listActiveBillingStores(
      createStoreDirectoryClient(rows, capture),
      "tenant_1",
    );

    expect(result).toHaveLength(101);
    expect(capture.orderByCount).toBe(2);
    const predicate = new PgDialect().sqlToQuery(capture.where!);
    expect(predicate.sql).toContain('"stores"."tenant_id"');
    expect(predicate.sql).toContain('"stores"."is_deleted"');
    expect(predicate.sql).toContain('"stores"."deleted_at" is null');
    expect(predicate.params).toEqual(["tenant_1", false]);
  });
});

type QueryCapture = {
  orderByCount?: number;
  where?: SQL;
};

function createStoreDirectoryClient(
  rows: { id: string }[],
  capture: QueryCapture,
) {
  return {
    select: () => ({
      from: (table: unknown) => {
        expect(table).toBe(stores);
        return {
          where: (where: SQL) => {
            capture.where = where;
            return {
              orderBy: async (...columns: unknown[]) => {
                capture.orderByCount = columns.length;
                return rows;
              },
            };
          },
        };
      },
    }),
  } as never;
}
