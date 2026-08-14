import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const migrationSql = readFileSync(
  new URL("../migrations/0047_crm_lead_session_outcomes.sql", import.meta.url),
  "utf8",
);

describe("CRM lead outcome migration", () => {
  it("creates the referenced scoped session key before its foreign key", () => {
    const referencedKey =
      'CREATE UNIQUE INDEX "crm_whatsapp_sessions_scope_id_unique"';
    const scopedForeignKey =
      'ADD CONSTRAINT "crm_whatsapp_session_command_receipts_scoped_session_fk"';

    expect(migrationSql).toContain(referencedKey);
    expect(migrationSql).toContain(scopedForeignKey);
    expect(migrationSql.indexOf(referencedKey)).toBeLessThan(
      migrationSql.indexOf(scopedForeignKey),
    );
  });
});
