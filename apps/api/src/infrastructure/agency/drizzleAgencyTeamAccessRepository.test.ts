import { tenantMemberships } from "@lojaveiculosv2/db";
import type { SQL } from "drizzle-orm";
import { PgDialect } from "drizzle-orm/pg-core";
import { describe, expect, it } from "vitest";
import { createDrizzleAgencyTeamAccessStoreDirectory } from "./drizzleAgencyTeamAccessRepository.js";

describe("createDrizzleAgencyTeamAccessStoreDirectory", () => {
  it("returns more than 200 active stores and rejects soft-deleted scope", async () => {
    const capture: QueryCapture = {};
    const rows = Array.from({ length: 201 }, (_, index) => ({
      storeId: `store_${String(index + 1)}`,
      storeName: `Loja ${String(index + 1)}`,
      storeSlug: `loja-${String(index + 1)}`,
    }));
    const directory = createDrizzleAgencyTeamAccessStoreDirectory(
      createDirectoryClient(rows, capture),
    );

    const result = await directory.listStores({
      tenantId: "tenant_1" as never,
      userId: "user_1" as never,
    });

    expect(result).toHaveLength(201);
    expect(capture.orderByCount).toBe(2);
    const predicate = new PgDialect().sqlToQuery(capture.where!);
    expect(predicate.sql).toContain('"stores"."deleted_at" is null');
    expect(predicate.sql).toContain('"tenants"."deleted_at" is null');
    expect(predicate.params).toEqual([
      "user_1",
      "tenant_1",
      "active",
      "agency",
      false,
      false,
    ]);
  });
});

type QueryCapture = {
  orderByCount?: number;
  where?: SQL;
};

function createDirectoryClient(
  rows: { storeId: string; storeName: string; storeSlug: string }[],
  capture: QueryCapture,
) {
  return {
    select: () => ({
      from: (table: unknown) => {
        expect(table).toBe(tenantMemberships);
        const chain = {
          innerJoin: () => chain,
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
        return chain;
      },
    }),
  } as never;
}
