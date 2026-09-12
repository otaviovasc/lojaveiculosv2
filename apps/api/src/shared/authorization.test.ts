import { describe, expect, it, vi } from "vitest";
import {
  AuthorizationError,
  assertAnyPermission,
  assertEntitlement,
  assertPermission,
} from "./authorization.js";
import { createServiceContext } from "./serviceContext.js";
import type { StoreScopedServiceContext } from "./serviceContext.js";

function createContext(
  input?: Partial<StoreScopedServiceContext>,
): StoreScopedServiceContext {
  return {
    actor: { id: "user_1", kind: "user" },
    audit: { record: vi.fn(async () => undefined) },
    entitlements: ["storefront"],
    logger: {
      error: vi.fn(),
      info: vi.fn(),
      warn: vi.fn(),
    },
    permissions: ["inventory.read"],
    platformAdmin: false,
    requestId: "req_1",
    storeId: "store_1",
    tenantId: "tenant_1",
    ...input,
  };
}

describe("authorization helpers", () => {
  it("returns the first granted permission from an alternative set", () => {
    const context = createContext({ permissions: ["lead.update"] });

    expect(assertAnyPermission(context, ["sale.draft", "lead.update"])).toBe(
      "lead.update",
    );
  });

  it("throws and logs when every alternative permission is missing", () => {
    const context = createContext();

    expect(() =>
      assertAnyPermission(context, ["sale.draft", "lead.update"]),
    ).toThrow("Missing one of required permissions: sale.draft, lead.update");
    expect(context.logger.warn).toHaveBeenCalledWith(
      "authorization.permission.denied",
      expect.objectContaining({
        permissions: ["sale.draft", "lead.update"],
        requestId: "req_1",
      }),
    );
  });

  it("throws and logs when a permission is missing", () => {
    const context = createContext();

    expect(() => assertPermission(context, "inventory.update_price")).toThrow(
      "Missing permission: inventory.update_price",
    );
    expect(context.logger.warn).toHaveBeenCalledWith(
      "authorization.permission.denied",
      expect.objectContaining({
        permission: "inventory.update_price",
        requestId: "req_1",
      }),
    );
  });

  it("throws and logs when an entitlement is missing", () => {
    const context = createContext();

    expect(() => assertEntitlement(context, "crm")).toThrow(
      "Missing entitlement: crm",
    );
    expect(context.logger.warn).toHaveBeenCalledWith(
      "authorization.entitlement.denied",
      expect.objectContaining({ entitlement: "crm" }),
    );
  });

  it("fails closed as authorization when entitlements are absent", () => {
    const context = createServiceContext({
      permissions: ["sale.read"],
      request: { requestId: "request_missing_entitlements" },
      storeId: "store_1",
      tenantId: "tenant_1",
    });

    expect(() => assertEntitlement(context, "sales")).toThrow(
      new AuthorizationError("Missing entitlement: sales"),
    );
  });
});
