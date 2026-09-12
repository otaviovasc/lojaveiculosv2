import { describe, expect, it } from "vitest";
import { providerIdentityCanBind } from "./drizzleBillingProviderIdentity.js";

describe("providerIdentityCanBind", () => {
  it("allows first binding and idempotent replay", () => {
    expect(providerIdentityCanBind(null, "provider_1")).toBe(true);
    expect(providerIdentityCanBind("provider_1", "provider_1")).toBe(true);
  });

  it("rejects rebinding an established provider identity", () => {
    expect(providerIdentityCanBind("provider_1", "provider_2")).toBe(false);
  });
});
