import { readFileSync } from "node:fs";
import { getTableConfig } from "drizzle-orm/pg-core";
import { describe, expect, it } from "vitest";
import { providerEvents } from "./index.js";

const migration = readFileSync(
  new URL(
    "../migrations/0043_provider_event_payload_digest.sql",
    import.meta.url,
  ),
  "utf8",
).toLowerCase();

describe("provider event replay digest", () => {
  it("models a constrained non-sensitive digest for replay comparison", () => {
    const config = getTableConfig(providerEvents);

    expect(config.columns.map(({ name }) => name)).toContain("payload_digest");
    expect(config.checks.map(({ name }) => name)).toContain(
      "provider_events_payload_digest_check",
    );
    expect(migration).toContain('add column "payload_digest" varchar(64)');
    expect(migration).toContain("^[0-9a-f]{64}$");
  });
});
