import { describe, expect, it } from "vitest";
import { canAccess, resolvePermissions } from "./accessPolicy.js";
import { permissionGroups } from "./permissionCatalog.js";

describe("CRM access policy", () => {
  it("keeps provider-neutral CRM permissions unique and operator-manageable", () => {
    const crmPermissions =
      permissionGroups.find((group) => group.key === "crm")?.permissions ?? [];
    const catalogKeys = permissionGroups.flatMap((group) =>
      group.permissions.map((permission) => permission.key),
    );

    expect(new Set(catalogKeys).size).toBe(catalogKeys.length);
    expect(crmPermissions.map((permission) => permission.key)).toEqual(
      expect.arrayContaining([
        "crm.messaging.connection.setup",
        "crm.messaging.connection.pair",
        "crm.conversations.read",
        "crm.conversations.read_unassigned",
        "crm.messages.send",
        "crm.conversations.assign",
        "crm.conversations.manage",
        "crm.attendances.manage",
      ]),
    );
    expect(catalogKeys).not.toContain("crm.whatsapp.connection.manage");
    expect(catalogKeys).not.toContain("crm.messaging.support.manage");
  });

  it("grants connection setup and pairing to manager roles only", () => {
    const connectionPermissions = [
      "crm.messaging.connection.setup",
      "crm.messaging.connection.pair",
    ] as const;

    for (const role of ["agency", "owner", "admin", "supervisor"] as const) {
      const permissions = resolvePermissions({ role });
      for (const permission of connectionPermissions) {
        expect(canAccess(permissions, permission)).toEqual({ allowed: true });
      }
    }
    for (const role of ["salesman", "investor"] as const) {
      const permissions = resolvePermissions({ role });
      for (const permission of connectionPermissions) {
        expect(canAccess(permissions, permission)).toEqual({
          allowed: false,
          reason: `Missing permission: ${permission}`,
        });
      }
    }
  });

  it("keeps sensitive CRM identity and consent authority owner/admin-only", () => {
    const sensitivePermissions = [
      "crm.consent.record",
      "crm.contact.merge",
      "crm.contact_identity.dispute",
      "crm.contact_identity.verify",
    ] as const;

    for (const role of ["agency", "owner", "admin"] as const) {
      const permissions = resolvePermissions({ role });
      for (const permission of sensitivePermissions) {
        expect(canAccess(permissions, permission)).toEqual({ allowed: true });
      }
    }
    for (const role of ["investor", "salesman", "supervisor"] as const) {
      const permissions = resolvePermissions({ role });
      for (const permission of sensitivePermissions) {
        expect(canAccess(permissions, permission)).toEqual({
          allowed: false,
          reason: `Missing permission: ${permission}`,
        });
      }
    }
  });

  it("preserves operator role behavior with channel-neutral CRM permissions", () => {
    const investor = resolvePermissions({ role: "investor" });
    const owner = resolvePermissions({ role: "owner" });
    const salesman = resolvePermissions({ role: "salesman" });
    const supervisor = resolvePermissions({ role: "supervisor" });
    const managerPermissions = [
      "crm.conversations.read",
      "crm.messages.send",
      "crm.conversations.assign",
      "crm.conversations.manage",
      "crm.attendances.manage",
    ] as const;

    expect(canAccess(investor, "crm.conversations.read")).toEqual({
      allowed: true,
    });
    expect(canAccess(investor, "crm.messages.send")).toEqual({
      allowed: false,
      reason: "Missing permission: crm.messages.send",
    });
    for (const permissions of [owner, salesman, supervisor]) {
      for (const permission of managerPermissions) {
        expect(canAccess(permissions, permission)).toEqual({ allowed: true });
      }
    }
    expect(canAccess(salesman, "crm.conversations.read_unassigned")).toEqual({
      allowed: true,
    });
  });
});
