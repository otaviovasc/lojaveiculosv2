import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import type { RoleKey } from "@lojaveiculosv2/shared";
import { defaultRolePermissions } from "../../../domains/identity/domain/accessPolicy.js";

const roleIds: Record<string, RoleKey> = {
  "11111111-1111-4111-8111-111111111111": "admin",
  "22222222-2222-4222-8222-222222222222": "agency",
  "55555555-5555-4555-8555-555555555555": "owner",
  "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb": "supervisor",
  "cccccccc-cccc-4ccc-8ccc-cccccccccccc": "salesman",
  "eeeeeeee-1111-4eee-8eee-eeeeeeeeeeee": "investor",
};

describe("role permission seed projection", () => {
  it("matches the canonical runtime defaults for every role", () => {
    const source = readFileSync(
      new URL(
        "../../../../../../docker/postgres/seed/product/16-role-permissions.sql",
        import.meta.url,
      ),
      "utf8",
    );
    const permissionInsert = source.slice(
      source.indexOf("INSERT INTO role_template_permissions"),
    );
    const projected = new Map<RoleKey, string[]>();
    const rowPattern = /\(\s*'([^']+)'\s*,\s*'([^']+)'\s*\)/g;

    for (const match of permissionInsert.matchAll(rowPattern)) {
      const role = roleIds[match[1] ?? ""];
      const permission = match[2];
      if (!role || !permission) continue;
      projected.set(role, [...(projected.get(role) ?? []), permission]);
    }

    for (const [role, permissions] of Object.entries(
      defaultRolePermissions,
    ) as [RoleKey, readonly string[]][]) {
      expect
        .soft(projected.get(role)?.sort(), role)
        .toEqual([...permissions].sort());
    }
  });
});
