import { PgDialect } from "drizzle-orm/pg-core";
import { describe, expect, it, vi } from "vitest";
import { queryCrmStatisticsAgents } from "./drizzleCrmStatisticsAgents.js";
import type { DrizzleCrmClient } from "./drizzleCrmRepository.js";

describe("queryCrmStatisticsAgents", () => {
  it("keeps deleted users and inactive memberships out of agent performance data", async () => {
    const statements: unknown[] = [];
    const execute = vi.fn(async (statement: unknown) => {
      statements.push(statement);
      return [];
    });

    await queryCrmStatisticsAgents({ execute } as unknown as DrizzleCrmClient, {
      from: new Date("2026-08-01T03:00:00.000Z"),
      storeId: "11111111-1111-4111-8111-111111111111",
      tenantId: "22222222-2222-4222-8222-222222222222",
      toExclusive: new Date("2026-08-08T03:00:00.000Z"),
    });

    const statement = statements[0];
    expect(statement).toBeDefined();
    const query = new PgDialect().sqlToQuery(statement as never);
    expect(query.sql).toContain("membership.status = 'active'");
    expect(query.sql).toContain("user_record.is_deleted = false");
  });
});
