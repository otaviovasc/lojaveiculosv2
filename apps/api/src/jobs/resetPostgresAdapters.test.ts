import { describe, expect, it } from "vitest";
import {
  createTruncateStatement,
  partitionProductTables,
} from "./resetPostgresAdapters.js";

describe("PostgreSQL environment reset", () => {
  it("preserves every vehicle_catalog_* table and resets everything else", () => {
    expect(
      partitionProductTables([
        "users",
        "vehicle_catalog_brands",
        "vehicle_catalog_price_history",
        "vehicle_catalogue_legacy",
      ]),
    ).toEqual({
      preserved: ["vehicle_catalog_brands", "vehicle_catalog_price_history"],
      resettable: ["users", "vehicle_catalogue_legacy"],
    });
  });

  it("builds one fail-closed truncate without cascade", () => {
    expect(createTruncateStatement(["stores", "users"])).toBe(
      'TRUNCATE TABLE "public"."stores", "public"."users" RESTART IDENTITY',
    );
    expect(() =>
      createTruncateStatement(["stores", 'users"; DROP TABLE plans']),
    ).toThrow("Unsafe PostgreSQL identifier");
    expect(() => createTruncateStatement([])).toThrow("No PostgreSQL tables");
  });
});
