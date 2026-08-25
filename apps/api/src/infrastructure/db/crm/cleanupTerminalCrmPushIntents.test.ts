import { describe, expect, it, vi } from "vitest";
import type { SQL } from "drizzle-orm";
import { PgDialect } from "drizzle-orm/pg-core";
import type { DrizzleCrmClient } from "./drizzleCrmRepository.js";
import { cleanupTerminalCrmPushIntents } from "./cleanupTerminalCrmPushIntents.js";

describe("terminal CRM push cleanup", () => {
  it("deletes only the bounded terminal candidate batch", async () => {
    let statement: unknown;
    const execute = vi.fn(async (value: unknown) => {
      statement = value;
      return [{ id: "one" }, { id: "two" }];
    });
    await expect(
      cleanupTerminalCrmPushIntents(
        { execute } as unknown as DrizzleCrmClient,
        { cutoff: new Date("2026-01-01T00:00:00Z"), limit: 100 },
      ),
    ).resolves.toBe(2);
    expect(execute).toHaveBeenCalledOnce();
    const query = new PgDialect().sqlToQuery(statement as SQL);
    expect(query.sql).toContain("state = 'delivered'");
    expect(query.sql).toContain("state = 'dead_letter'");
    expect(query.sql).toContain("for update skip locked");
    expect(query.sql).not.toContain("state = 'pending'");
    expect(query.sql).not.toContain("state = 'processing'");
    expect(query.params.at(-1)).toBe(100);
  });
});
