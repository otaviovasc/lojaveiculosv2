import { readFileSync } from "node:fs";
import { getTableConfig } from "drizzle-orm/pg-core";
import { describe, expect, it } from "vitest";
import {
  conversationAttendances,
  conversationCycles,
  leads,
  opportunities,
  storeMemberships,
} from "./index.js";

const migration = readFileSync(
  new URL(
    "../migrations/0058_canonical_crm_operational_cutover.sql",
    import.meta.url,
  ),
  "utf8",
);

describe("CRM assignee membership integrity", () => {
  it("models exact tenant/store membership foreign keys", () => {
    expect(
      getTableConfig(storeMemberships).indexes.map(({ config }) => config.name),
    ).toContain("store_memberships_tenant_store_user_unique");
    expect(
      getTableConfig(storeMemberships).foreignKeys.map((key) => key.getName()),
    ).toContain("store_memberships_store_tenant_fk");

    for (const [table, name] of [
      [leads, "leads_scoped_assignee_membership_fk"],
      [opportunities, "opportunities_scoped_assignee_membership_fk"],
      [conversationCycles, "conversation_cycles_scoped_assignee_membership_fk"],
      [
        conversationAttendances,
        "conversation_attendances_scoped_assignee_membership_fk",
      ],
    ] as const) {
      const foreignKey = getTableConfig(table).foreignKeys.find(
        (key) => key.getName() === name,
      );
      expect(foreignKey?.reference().columns.map(({ name }) => name)).toEqual([
        "tenant_id",
        "store_id",
        "assigned_user_id",
      ]);
      expect(
        foreignKey?.reference().foreignColumns.map(({ name }) => name),
      ).toEqual(["tenant_id", "store_id", "user_id"]);
    }
  });

  it("fails closed for inactive or deleted assignment targets", () => {
    expect(migration).toContain("membership.\"status\" = 'active'");
    expect(migration).toContain('assignee."is_deleted" = false');
    expect(migration).toContain('CREATE TRIGGER "leads_active_assignee"');
    expect(migration.indexOf("CRM assignment integrity blocked")).toBeLessThan(
      migration.indexOf('ALTER TABLE "leads"\n  ADD CONSTRAINT'),
    );
  });
});
