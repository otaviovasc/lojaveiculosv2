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
    const salesman = resolvePermissions({ role: "salesman" });

    expect(canAccess(investor, "crm.whatsapp.read")).toEqual({
      allowed: true,
    });
    expect(canAccess(investor, "crm.whatsapp.send")).toEqual({
      allowed: false,
      reason: "Missing permission: crm.whatsapp.send",
    });
    expect(canAccess(salesman, "crm.whatsapp.send")).toEqual({
      allowed: true,
    });
    expect(canAccess(salesman, "crm.whatsapp.assign")).toEqual({
      allowed: true,
    });
  });
});
