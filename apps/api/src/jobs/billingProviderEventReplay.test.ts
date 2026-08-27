import * as productSchema from "@lojaveiculosv2/db";
import { drizzle } from "drizzle-orm/postgres-js";
import { describe, expect, it } from "vitest";
import { billingProviderEventReplayCandidatesQuery } from "./billingProviderEventReplay.js";

describe("billing provider event replay query", () => {
  it("encodes replay cutoff dates before passing them to postgres-js", () => {
    const db = drizzle.mock({ schema: productSchema });
    const now = new Date("2026-08-27T12:47:13.000Z");
    const query = billingProviderEventReplayCandidatesQuery(
      db,
      "staging",
      now,
    ).toSQL();

    expect(query.params.some((parameter) => parameter instanceof Date)).toBe(
      false,
    );
    expect(query.params).toContain(now.toISOString());
  });
});
