import { describe, expect, it } from "vitest";
import { canAccess, resolvePermissions } from "./accessPolicy.js";
import { permissionGroups } from "./permissionCatalog.js";

describe("access policy", () => {
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

  it("allows explicit store-level permission overrides", () => {
    const permissions = resolvePermissions({
      overrides: [{ allowed: true, permission: "inventory.update_price" }],
      role: "salesman",
    });

    expect(canAccess(permissions, "inventory.update_price")).toEqual({
      allowed: true,
    });
  });

  it("keeps WhatsApp permissions explicit and operator-manageable", () => {
    const crmPermissions =
      permissionGroups.find((group) => group.key === "crm")?.permissions ?? [];

    expect(crmPermissions.map((permission) => permission.key)).toEqual(
      expect.arrayContaining([
        "crm.whatsapp.list",
        "crm.whatsapp.read",
        "crm.whatsapp.send",
        "crm.whatsapp.assign",
        "crm.whatsapp.close",
        "crm.whatsapp.toggle_intervention",
      ]),
    );
  });

  it("mirrors prior WhatsApp role behavior with explicit CRM permissions", () => {
    const investor = resolvePermissions({ role: "investor" });
    const owner = resolvePermissions({ role: "owner" });
    const salesman = resolvePermissions({ role: "salesman" });
    const supervisor = resolvePermissions({ role: "supervisor" });
    const operatorPermissions = [
      "crm.whatsapp.list",
      "crm.whatsapp.read",
      "crm.whatsapp.send",
      "crm.whatsapp.assign",
      "crm.whatsapp.close",
      "crm.whatsapp.toggle_intervention",
    ] as const;

    expect(canAccess(investor, "crm.whatsapp.read")).toEqual({
      allowed: true,
    });
    expect(canAccess(investor, "crm.whatsapp.send")).toEqual({
      allowed: false,
      reason: "Missing permission: crm.whatsapp.send",
    });
    for (const permissions of [owner, salesman, supervisor]) {
      for (const permission of operatorPermissions) {
        expect(canAccess(permissions, permission)).toEqual({ allowed: true });
      }
    }
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
});
