import type { SQL } from "drizzle-orm";
import { PgDialect } from "drizzle-orm/pg-core";
import { describe, expect, it, vi } from "vitest";
import { createCrmPushIntentOperations } from "./drizzleCrmPushIntentRepository.js";
import type { DrizzleCrmClient } from "./drizzleCrmRepository.js";

describe("CRM push intent repository", () => {
  it("serializes claim timestamps for the postgres-js driver", async () => {
    const execute = vi.fn().mockResolvedValue([]);
    const repository = createCrmPushIntentOperations({
      execute,
    } as unknown as DrizzleCrmClient);

    await expect(
      repository.claimDeliveryBatch({
        leaseDurationMs: 60_000,
        limit: 25,
        now: new Date("2026-08-25T00:00:00Z"),
        workerId: "worker-1",
      }),
    ).resolves.toEqual([]);

    const statement = execute.mock.calls[0]?.[0] as SQL;
    const query = new PgDialect().sqlToQuery(statement);

    expect(query.params).toEqual([
      "2026-08-25T00:00:00.000Z",
      "2026-08-25T00:00:00.000Z",
      25,
      "2026-08-25T00:01:00.000Z",
      "2026-08-25T00:00:00.000Z",
    ]);
  });
});
