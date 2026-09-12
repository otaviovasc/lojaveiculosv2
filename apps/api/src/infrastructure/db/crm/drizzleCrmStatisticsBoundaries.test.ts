import { PgDialect } from "drizzle-orm/pg-core";
import { describe, expect, it, vi } from "vitest";
import { queryCrmStatisticsCore } from "./drizzleCrmStatisticsCore.js";
import { queryCrmStatisticsAgents } from "./drizzleCrmStatisticsAgents.js";
import {
  queryCrmStatisticsBreakdowns,
  queryCrmStatisticsDaily,
} from "./drizzleCrmStatisticsDimensions.js";
import type { DrizzleCrmClient } from "./drizzleCrmRepository.js";

describe("CRM statistics period boundaries", () => {
  it("uses an exact exclusive upper bound so adjacent windows cannot double-count", async () => {
    const statements: unknown[] = [];
    const execute = vi.fn(async (statement: unknown) => {
      statements.push(statement);
      return [
        {
          conversations_created: 0,
        },
      ];
    });
    const from = new Date("2026-08-01T03:00:00.000Z");
    const toExclusive = new Date("2026-08-08T03:00:00.000Z");

    const db = { execute } as unknown as DrizzleCrmClient;
    const input = {
      from,
      storeId: "11111111-1111-4111-8111-111111111111",
      tenantId: "22222222-2222-4222-8222-222222222222",
      toExclusive,
    };
    await queryCrmStatisticsCore(db, input);
    await queryCrmStatisticsBreakdowns(db, input);
    await queryCrmStatisticsDaily(db, input);
    await queryCrmStatisticsAgents(db, input);

    const queries = statements.map((statement) =>
      new PgDialect().sqlToQuery(statement as never),
    );
    expect(queries).toHaveLength(4);
    for (const query of queries) {
      expect(query.sql.toLowerCase()).not.toContain(" between ");
      expect(query.sql).toMatch(/>= \$\d+::timestamptz/);
      expect(query.sql).toMatch(/< \$\d+::timestamptz/);
      expect(query.params).toContain(from.toISOString());
      expect(query.params).toContain(toExclusive.toISOString());
    }
    const sql = queries
      .map((query) => query.sql)
      .join("\n")
      .toLowerCase();
    expect(sql).toContain("sender_origin = 'external_bot'");
    expect(sql).toContain("sender = 'system'");
    expect(sql).toContain("sender not in ('human', 'bot', 'system')");
    expect(sql).not.toContain("minibot");
  });
});
