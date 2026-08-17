import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const permission = "crm.routing.default.manage";
const migration = readMigration("0056_crm_routing_default_permission.sql");
const localProjection = readFileSync(
  new URL(
    "../../../docker/postgres/seed/product/16-role-permissions.sql",
    import.meta.url,
  ),
  "utf8",
);

describe("CRM default routing permission migration", () => {
  it("projects setup grants and deny overrides to the routing field", () => {
    expect(migration).toContain("crm.messaging.connection.setup");
    expect(migration).toContain(permission);
    expect(migration).toContain('INSERT INTO "role_template_permissions"');
    expect(migration).toContain(
      'INSERT INTO "membership_permission_overrides"',
    );
    expect(migration).toContain(
      '"membership_permission_overrides"."allowed" AND EXCLUDED."allowed"',
    );
  });

  it("includes the routing permission in local fresh-install roles", () => {
    expect(localProjection.match(new RegExp(permission, "gu"))).toHaveLength(4);
  });
});

function readMigration(name: string) {
  return readFileSync(
    new URL(`../migrations/${name}`, import.meta.url),
    "utf8",
  );
}
