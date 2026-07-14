import { PgDialect } from "drizzle-orm/pg-core";
import type { SQL } from "drizzle-orm";
import { describe, expect, it } from "vitest";
import type { DrizzleFinanceClient } from "./drizzleFinanceRepository.js";
import { validateFinanceLinkTargets } from "./drizzleFinanceLinkTargets.js";

describe("finance link target validation", () => {
  it("validates vehicle listings inside the requested tenant/store scope", async () => {
    let whereClause: SQL | undefined;
    const db = {
      select: () => ({
        from: () => ({
          where: (condition: SQL) => {
            whereClause = condition;
            return { limit: async () => [{ id: "listing_1" }] };
          },
        }),
      }),
    } as unknown as DrizzleFinanceClient;

    await expect(
      validateFinanceLinkTargets(db, {
        links: [{ targetId: "listing_1", targetType: "vehicle_listing" }],
        storeId: "store_1",
        tenantId: "tenant_1",
      }),
    ).resolves.toBeUndefined();

    const query = new PgDialect().sqlToQuery(whereClause!);
    expect(query.params).toEqual(["listing_1", "store_1", "tenant_1"]);
    expect(query.sql).toContain('"vehicle_listings"."id"');
    expect(query.sql).toContain('"vehicle_listings"."store_id"');
    expect(query.sql).toContain('"vehicle_listings"."tenant_id"');
  });
});
