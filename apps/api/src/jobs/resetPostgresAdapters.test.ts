import { describe, expect, it } from "vitest";
import {
  createResetTruncateStatements,
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

  it("temporarily bypasses only the intervention ledger truncate guard", () => {
    expect(
      createResetTruncateStatements([
        "crm_whatsapp_intervention_ledger",
        "stores",
      ]),
    ).toEqual([
      'ALTER TABLE "public"."crm_whatsapp_intervention_ledger" DISABLE TRIGGER "crm_whatsapp_intervention_ledger_no_truncate_trigger"',
      'TRUNCATE TABLE "public"."crm_whatsapp_intervention_ledger", "public"."stores" RESTART IDENTITY',
      'ALTER TABLE "public"."crm_whatsapp_intervention_ledger" ENABLE TRIGGER "crm_whatsapp_intervention_ledger_no_truncate_trigger"',
    ]);

    expect(createResetTruncateStatements(["audit_events"])).toEqual([
      'TRUNCATE TABLE "public"."audit_events" RESTART IDENTITY',
    ]);
  });
});
