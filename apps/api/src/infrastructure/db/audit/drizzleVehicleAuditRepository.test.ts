import type { SQL } from "drizzle-orm";
import { PgDialect } from "drizzle-orm/pg-core";
import { describe, expect, it } from "vitest";
import {
  createDrizzleVehicleAuditRepository,
  type DrizzleVehicleAuditClient,
} from "./drizzleVehicleAuditRepository.js";

describe("drizzle vehicle audit repository", () => {
  it("matches requested ids in both the primary and related entities", async () => {
    let whereClause: SQL | undefined;
    const db = {
      select: () => ({
        from: () => ({
          where: (condition: SQL) => {
            whereClause = condition;
            return {
              orderBy: () => ({ limit: async () => [] }),
            };
          },
        }),
      }),
    } as unknown as DrizzleVehicleAuditClient;
    const repository = createDrizzleVehicleAuditRepository(db);

    await expect(
      repository.listByEntityIds({
        entityIds: ["listing_1", "media_1"],
        limit: 50,
        storeId: "store_1",
        tenantId: "tenant_1",
      }),
    ).resolves.toEqual([]);

    const query = new PgDialect().sqlToQuery(whereClause!);
    expect(query.sql).toContain('"audit_events"."entity_id" in');
    expect(query.sql).toContain(
      'jsonb_array_elements("audit_events"."related_entities")',
    );
    expect(query.sql).toContain("related_entity ->> 'id'");
    expect(query.params).toEqual(
      expect.arrayContaining(["listing_1", "media_1", "store_1", "tenant_1"]),
    );
  });
});
