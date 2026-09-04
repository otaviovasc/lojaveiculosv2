import {
  leads,
  sales,
  stores,
  vehicleListings,
  vehicleUnits,
} from "@lojaveiculosv2/db";
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

  it("returns every active store and excludes soft-deleted store facts", async () => {
    const selected: SelectedQuery[] = [];
    const repository = createDrizzleAgencyStatsRepository(
      createQueryCapturingDb(selected, 101),
    );

    const report = await repository.getStats({
      period: { from: "2026-08-01", to: "2026-08-22" },
      tenantId: "tenant_1",
    });

    expect(report.availableStores).toHaveLength(101);
    expect(report.stores).toHaveLength(101);
    expect(report.totals.storeCount).toBe(101);
    for (const table of [stores, vehicleListings, vehicleUnits, sales, leads]) {
      const predicate = renderSql(
        selected.find((query) => query.table === table)?.where,
      );
      expect(predicate.sql).toContain('"deleted_at" is null');
    }
  });
});

function createQueryCapturingDb(selected: SelectedQuery[], storeCount = 1) {
  return {
    select() {
      return {
        from(table: unknown) {
          const query: SelectedQuery = { table };
          selected.push(query);
          const rows =
            table === stores
              ? Array.from({ length: storeCount }, (_, index) => ({
                  storeId: `store_${String(index + 1)}`,
                  storeName: `Loja ${String(index + 1)}`,
                  storeSlug: `loja-${String(index + 1)}`,
                }))
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
