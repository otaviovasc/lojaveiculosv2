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

  it("claims a notification with no grant and preserves its attendance state", async () => {
    const execute = vi
      .fn<(statement: SQL) => Promise<unknown[]>>()
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([
        {
          id: "00000000-0000-4000-8000-000000000001",
          action_class: "notification",
          event_type: "human_attendance_changed",
          grant_token: null,
          grant_expires_at: "2026-08-13T15:00:00.000Z",
          occurred_at: "2026-08-12T15:00:00.000Z",
          payload: {
            channel: "whatsapp",
            humanAttendanceState: "IN_HUMAN_SERVICE",
          },
        },
      ]);
    const manager = createDrizzleExternalBotManager({
      db: { execute } as never,
      modelVersion: "v1",
    });
    const event = await manager.eventOutbox.claim(
      new Date("2026-08-12T15:00:00.000Z"),
    );
    expect(event).toMatchObject({
      actionClass: "notification",
      grant: null,
      payload: { humanAttendanceState: "IN_HUMAN_SERVICE" },
    });
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
    expect(claim).toContain(
      "action_class = 'notification' and event_type = 'human_attendance_changed'",
    );
  });
});
import type { SQL } from "drizzle-orm";
