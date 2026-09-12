import { describe, expect, it } from "vitest";
import { createServiceContext } from "../../../../shared/serviceContext.js";
import { listCommissionRules } from "./listCommissionRules.js";
import { listFinanceEntries } from "./listFinanceEntries.js";

describe("finance catalog entitlements", () => {
  it("rejects finance access when permission alone is granted", async () => {
    const context = createServiceContext({
      actor: { id: "owner_1", kind: "user" },
      entitlements: [],
      permissions: ["finance.read"],
      request: { requestId: "request_finance_entitlement" },
      storeId: "store_1",
      tenantId: "tenant_1",
    });

    await expect(listFinanceEntries(context, {})).rejects.toThrow(
      "Missing entitlement: finance",
    );
  });

  it("uses the commissions entitlement independently from permissions", async () => {
    const context = createServiceContext({
      actor: { id: "owner_1", kind: "user" },
      entitlements: ["finance"],
      permissions: ["commissions.read"],
      request: { requestId: "request_commissions_entitlement" },
      storeId: "store_1",
      tenantId: "tenant_1",
    });

    await expect(listCommissionRules(context, {})).rejects.toThrow(
      "Missing entitlement: commissions",
    );
  });
});
