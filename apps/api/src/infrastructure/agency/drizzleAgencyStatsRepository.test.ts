import { leads, sales, stores } from "@lojaveiculosv2/db";
import type { SQL } from "drizzle-orm";
import { PgDialect } from "drizzle-orm/pg-core";
import { describe, expect, it } from "vitest";
import { createDrizzleAgencyStatsRepository } from "./drizzleAgencyStatsRepository.js";

type SelectedQuery = {
  table: unknown;
  where?: unknown;
};

describe("createDrizzleAgencyStatsRepository", () => {
  it("queries timestamp facts with São Paulo half-open day boundaries", async () => {
    const selected: SelectedQuery[] = [];
    const repository = createDrizzleAgencyStatsRepository(
      createQueryCapturingDb(selected),
    );

    await repository.getStats({
      period: { from: "2026-08-01", to: "2026-08-22" },
      tenantId: "tenant_1",
    });

    for (const table of [sales, leads]) {
      const predicate = renderSql(
        selected.find((query) => query.table === table)?.where,
      );
      expect(predicate.sql).toContain(" >= ");
      expect(predicate.sql).toContain(" < ");
      expect(predicate.params).toContain("2026-08-01T03:00:00.000Z");
      expect(predicate.params).toContain("2026-08-23T03:00:00.000Z");
      expect(predicate.params).not.toContain("2026-08-01T00:00:00.000Z");
    }
  });
});

function createQueryCapturingDb(selected: SelectedQuery[]) {
  return {
    select() {
      return {
        from(table: unknown) {
          const query: SelectedQuery = { table };
          selected.push(query);
          const rows =
            table === stores
              ? [
                  {
                    storeId: "store_1",
                    storeName: "Centro",
                    storeSlug: "centro",
                  },
                ]
              : [];
          const result = {
            groupBy: async () => rows,
            orderBy: async () => rows,
          };
          const chain = {
            leftJoin: () => chain,
            where(condition?: unknown) {
              query.where = condition;
              return result;
            },
          };
          return chain;
        },
      };
    },
  } as never;
}

function renderSql(value: unknown) {
  if (!value) throw new Error("Expected a query predicate.");
  return new PgDialect().sqlToQuery(value as SQL);
}
