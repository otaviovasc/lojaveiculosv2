import { describe, expect, it } from "vitest";
import { createServiceContext } from "../../../../shared/serviceContext.js";
import { listSales } from "./listSales.js";

describe("sales entitlement", () => {
  it("rejects a permission-bearing actor without paid sales access", async () => {
    const context = createServiceContext({
      actor: { id: "owner_1", kind: "user" },
      entitlements: [],
      permissions: ["sale.read"],
      request: { requestId: "request_sales_entitlement" },
      storeId: "store_1",
      tenantId: "tenant_1",
    });

    await expect(listSales(context, { limit: 100, offset: 0 })).rejects.toThrow(
      "Missing entitlement: sales",
    );
  });
});
