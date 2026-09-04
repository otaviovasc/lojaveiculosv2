import { describe, expect, it } from "vitest";
import {
  createTruncateStatement,
  partitionProductTables,
  selectAppendOnlyTruncateTriggers,
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

  it("selects only the canonical append-only truncate guard", () => {
    expect(
      selectAppendOnlyTruncateTriggers([
        "crm_conversation_attendance_events",
        "stores",
      ]),
    ).toEqual([
      {
        table: "crm_conversation_attendance_events",
        trigger: "crm_conversation_attendance_events_no_truncate_trigger",
      },
    ]);
    expect(
      partitionProductTables(["crm_conversation_attendance_events"]).resettable,
    ).toEqual(["crm_conversation_attendance_events"]);
    expect(selectAppendOnlyTruncateTriggers(["audit_events"])).toEqual([]);
  });
});
