import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const migrationSql = readFileSync(
  new URL(
    "../migrations/0075_developer_admin_store_membership_invariant.sql",
    import.meta.url,
  ),
  "utf8",
);

describe("developer-only admin identity assignment invariant", () => {
  it("fails closed when an existing customer assignment references admin", () => {
    expect(migrationSql).toContain(
      "Developer admin assignment invariant blocked",
    );
    expect(migrationSql).toContain("invalid_assignment_count > 0");
    expect(migrationSql).toContain("platform_admin_memberships");
    expect(migrationSql).not.toContain("DELETE FROM");
    expect(migrationSql).not.toContain('UPDATE "store_memberships"');
    expect(migrationSql).not.toContain('UPDATE "tenant_memberships"');
    expect(migrationSql).not.toContain('UPDATE "identity_invitations"');
  });

  it("guards every customer assignment and role-template promotion", () => {
    expect(
      migrationSql.match(/BEFORE INSERT OR UPDATE OF "role_template_id"/g),
    ).toHaveLength(3);
    expect(migrationSql).toContain(
      'CREATE OR REPLACE FUNCTION "prevent_identity_assignment_admin_role"()',
    );
    expect(migrationSql).toContain('ON "store_memberships"');
    expect(migrationSql).toContain('ON "tenant_memberships"');
    expect(migrationSql).toContain('ON "identity_invitations"');
    expect(migrationSql).toContain("FOR KEY SHARE");
    expect(migrationSql).toContain('BEFORE UPDATE OF "role_key"');
    expect(migrationSql).toContain(
      'CREATE OR REPLACE FUNCTION "prevent_role_template_admin_promotion"()',
    );
  });

  it("documents a read-only staging preflight grouped by assignment source", () => {
    expect(migrationSql).toContain("Staging preflight (read-only");
    expect(migrationSql).toContain("GROUP BY assignment_source");
    expect(migrationSql).toContain(
      "SELECT 'identity_invitations', role_template_id FROM identity_invitations",
    );
  });
});
