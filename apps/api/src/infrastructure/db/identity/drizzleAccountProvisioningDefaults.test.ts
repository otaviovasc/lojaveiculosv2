import { describe, expect, it } from "vitest";
import { createPublicStorefrontDefaults } from "./drizzleAccountProvisioningDefaults.js";

describe("account provisioning storefront defaults", () => {
  it("publishes every newly provisioned storefront immediately", () => {
    expect(createPublicStorefrontDefaults("tenant-1", "store-1")).toEqual({
      isPublished: true,
      storeId: "store-1",
      tenantId: "tenant-1",
    });
  });
});
