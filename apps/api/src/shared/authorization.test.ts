import { describe, expect, it, vi } from "vitest";
import { assertEntitlement, assertPermission } from "./authorization.js";
import type { StoreScopedServiceContext } from "./serviceContext.js";

function createContext(
  input?: Partial<StoreScopedServiceContext>,
): StoreScopedServiceContext {
  return {
    actor: { id: "user_1", kind: "user" },
    audit: { record: vi.fn(async () => undefined) },
    entitlements: ["subdomain"],
    logger: {
      error: vi.fn(),
      info: vi.fn(),
      warn: vi.fn(),
    },
    permissions: ["inventory.read"],
    requestId: "req_1",
    storeId: "store_1",
    tenantId: "tenant_1",
    ...input,
  };
}

describe("authorization helpers", () => {
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
});
