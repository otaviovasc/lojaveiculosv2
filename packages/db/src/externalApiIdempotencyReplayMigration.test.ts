import { readFileSync } from "node:fs";
import { getTableConfig } from "drizzle-orm/pg-core";
import { describe, expect, it } from "vitest";
import { apiIdempotencyKeys } from "./index.js";

const migrationSql = readFileSync(
  new URL(
    "../migrations/0067_external_api_idempotency_replay.sql",
    import.meta.url,
  ),
  "utf8",
);
const journal = JSON.parse(
  readFileSync(
    new URL("../migrations/meta/_journal.json", import.meta.url),
    "utf8",
  ),
) as { entries: { idx: number; tag: string }[] };

describe("external API idempotency replay schema", () => {
  it("stores only bounded replay payload fields on the existing atomic key", () => {
    const config = getTableConfig(apiIdempotencyKeys);
    expect(
      config.columns.find((column) => column.name === "response_body")
        ?.dataType,
    ).toBe("json");
    expect(
      config.columns.find((column) => column.name === "response_content_type")
        ?.columnType,
    ).toBe("PgVarchar");
    expect(
      config.indexes.find(
        ({ config: index }) =>
          index.name === "api_idempotency_keys_client_key_unique",
      )?.config.unique,
    ).toBe(true);
    expect(
      config.checks.find(
        (constraint) =>
          constraint.name === "api_idempotency_keys_replay_response_check",
      ),
    ).toBeDefined();
  });

  it("adds the replay columns in the registered migration", () => {
    expect(migrationSql).toContain('ADD COLUMN "response_body" jsonb');
    expect(migrationSql).toContain(
      'ADD COLUMN "response_content_type" varchar(100)',
    );
    expect(migrationSql).toContain(
      'octet_length("response_body"::text) <= 524288',
    );
    expect(migrationSql).toContain("SET \"status\" = 'failed'");
    expect(journal.entries.at(-1)).toEqual({
      idx: 67,
      tag: "0067_external_api_idempotency_replay",
      version: "7",
      when: 1787702400000,
      breakpoints: true,
    });
  });
});
