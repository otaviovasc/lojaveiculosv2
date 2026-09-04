import { describe, expect, it } from "vitest";
import {
  canAccess,
  defaultRolePermissions,
  resolvePermissions,
} from "./accessPolicy.js";
import { permissionGroups } from "./permissionCatalog.js";

describe("access policy", () => {
  it("grants the core dashboard to every store role by default", () => {
    for (const role of [
      "agency",
      "admin",
      "investor",
      "owner",
      "salesman",
      "supervisor",
    ] as const) {
      expect(canAccess(resolvePermissions({ role }), "dashboard.read")).toEqual(
        {
          allowed: true,
        },
      );
    }
  });

  it("keeps owner and agency defaults aligned with every assignable permission", () => {
    const assignablePermissions = permissionGroups.flatMap((group) =>
      group.permissions.map((permission) => permission.key),
    );

    for (const role of ["agency", "owner"] as const) {
      expect(defaultRolePermissions[role]).toEqual(
        expect.arrayContaining(assignablePermissions),
      );
    }
  });

  it("keeps platform support authority out of every store role projection", () => {
    for (const role of [
      "agency",
      "admin",
      "investor",
      "owner",
      "salesman",
      "supervisor",
    ] as const) {
      expect(resolvePermissions({ role })).not.toContain(
        "crm.messaging.support.manage",
      );
    }

    expect(
      resolvePermissions({
        overrides: [
          { allowed: true, permission: "crm.messaging.support.manage" },
        ],
        role: "owner",
      }),
    ).not.toContain("crm.messaging.support.manage");
  });

  it("keeps commission rules and settlement separated by role", () => {
    for (const role of ["agency", "owner", "admin"] as const) {
      const permissions = resolvePermissions({ role });
      expect(permissions).toContain("billing.manage");
      expect(permissions).toEqual(
        expect.arrayContaining([
          "commissions.read",
          "commissions.rules.manage",
          "commissions.settle",
        ]),
      );
    }

    expect(resolvePermissions({ role: "supervisor" })).toEqual(
      expect.arrayContaining(["commissions.read", "commissions.rules.manage"]),
    );
    expect(resolvePermissions({ role: "supervisor" })).not.toContain(
      "commissions.settle",
    );
    expect(resolvePermissions({ role: "investor" })).toContain("finance.read");
    expect(resolvePermissions({ role: "investor" })).not.toContain(
      "commissions.settle",
    );
    expect(resolvePermissions({ role: "salesman" })).not.toContain(
      "commissions.read",
    );
  });

  it("does not duplicate permissions inside default role projections", () => {
    for (const permissions of Object.values(defaultRolePermissions)) {
      expect(new Set(permissions).size).toBe(permissions.length);
    }
  });

  it("keeps salesman away from price changes by default", () => {
    const permissions = resolvePermissions({ role: "salesman" });

    expect(canAccess(permissions, "inventory.update_price")).toEqual({
      allowed: false,
      reason: "Missing permission: inventory.update_price",
    });
    expect(canAccess(permissions, "inventory.update_description")).toEqual({
      allowed: true,
    });
  });

  it("keeps resale analysis generation unavailable to read-only investors", () => {
    expect(
      canAccess(
        resolvePermissions({ role: "investor" }),
        "inventory.resale_analysis_generate",
      ),
    ).toEqual({
      allowed: false,
      reason: "Missing permission: inventory.resale_analysis_generate",
    });
    expect(
      canAccess(
        resolvePermissions({ role: "salesman" }),
        "inventory.resale_analysis_generate",
      ),
    ).toEqual({ allowed: true });
  });

  it("allows explicit store-level permission overrides", () => {
    const permissions = resolvePermissions({
      overrides: [{ allowed: true, permission: "inventory.update_price" }],
      role: "salesman",
    });

    expect(canAccess(permissions, "inventory.update_price")).toEqual({
      allowed: true,
    });
  });

  it("allows store owners to manage fiscal documents, recipients, and templates", () => {
    const permissions = resolvePermissions({ role: "owner" });

    expect(permissions).toEqual(
      expect.arrayContaining([
        "fiscal.manage",
        "fiscal.document.issue",
        "fiscal.document.cancel",
        "fiscal.recipient.manage",
        "fiscal.template.manage",
      ]),
    );
  });

  it("keeps automation approval manager-only by default", () => {
    const salesman = resolvePermissions({ role: "salesman" });
    const supervisor = resolvePermissions({ role: "supervisor" });
    const automationPermissions =
      permissionGroups.find((group) => group.key === "automation")
        ?.permissions ?? [];

    expect(automationPermissions.map((item) => item.key)).toEqual([
      "automation.read",
      "automation.run",
      "automation.cancel",
      "automation.approve",
    ]);
    expect(canAccess(salesman, "automation.run")).toEqual({ allowed: true });
    expect(canAccess(salesman, "automation.approve")).toEqual({
      allowed: false,
      reason: "Missing permission: automation.approve",
    });
    expect(canAccess(supervisor, "automation.approve")).toEqual({
      allowed: true,
    });
  });

  it("keeps automatic finance rules manager-only by default", () => {
    const financePermissions =
      permissionGroups.find((group) => group.key === "finance")?.permissions ??
      [];

    expect(financePermissions.map((item) => item.key)).toContain(
      "finance.auto_entries.manage",
    );
    for (const role of ["agency", "owner", "admin", "supervisor"] as const) {
      expect(
        canAccess(resolvePermissions({ role }), "finance.auto_entries.manage"),
      ).toEqual({ allowed: true });
    }
    for (const role of ["investor", "salesman"] as const) {
      expect(
        canAccess(resolvePermissions({ role }), "finance.auto_entries.manage"),
      ).toEqual({
        allowed: false,
        reason: "Missing permission: finance.auto_entries.manage",
      });
    }
  });
});
