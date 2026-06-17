import { describe, expect, it } from "vitest";
import { canAccess, resolvePermissions } from "./accessPolicy.js";

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
});
