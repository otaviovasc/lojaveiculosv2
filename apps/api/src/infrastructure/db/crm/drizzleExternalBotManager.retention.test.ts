import { PgDialect } from "drizzle-orm/pg-core";
import { describe, expect, it, vi } from "vitest";
import { createDrizzleExternalBotManager } from "./drizzleExternalBotManager.js";

describe("external bot event retention", () => {
  it("destroys a grant immediately when delivery completes", async () => {
    const execute = vi.fn<(statement: SQL) => Promise<unknown[]>>(async () =>
      Promise.resolve([]),
    );
    const manager = createDrizzleExternalBotManager({
      db: { execute } as never,
      modelVersion: "v1",
    });

    await manager.eventOutbox.markDelivered(
      "00000000-0000-4000-8000-000000000001",
    );

    const statement = execute.mock.calls[0]?.[0];
    const query = new PgDialect().sqlToQuery(statement!).sql.toLowerCase();
    expect(query).toContain("set state='delivered', grant_token=null");
  });

  it("expires stale grants before claiming retryable events", async () => {
    const execute = vi.fn<(statement: SQL) => Promise<unknown[]>>(async () =>
      Promise.resolve([]),
    );
    const manager = createDrizzleExternalBotManager({
      db: { execute } as never,
      modelVersion: "v1",
    });

    await manager.eventOutbox.claim(new Date("2026-08-12T15:00:00.000Z"));

    expect(execute).toHaveBeenCalledTimes(2);
    const expiry = new PgDialect()
      .sqlToQuery(execute.mock.calls[0]![0])
      .sql.toLowerCase();
    const claim = new PgDialect()
      .sqlToQuery(execute.mock.calls[1]![0])
      .sql.toLowerCase();
    expect(expiry).toContain("grant_token = null");
    expect(expiry).toContain("payload = '{}'::jsonb");
    expect(claim).toContain("grant_expires_at >");
    expect(claim).toContain("grant_token is not null");
  });
});
import type { SQL } from "drizzle-orm";
