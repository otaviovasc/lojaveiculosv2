import { describe, expect, it } from "vitest";
import { stripStorageEnvironmentPrefix } from "./storageKeyScope.js";

describe("stripStorageEnvironmentPrefix", () => {
  it.each([
    ["l", "local"],
    ["s", "staging"],
    ["p", "production"],
  ])("strips the %s environment prefix", (prefix, environment) => {
    expect(
      stripStorageEnvironmentPrefix(`${prefix}/tenants/tenant_1`, environment),
    ).toBe("tenants/tenant_1");
  });

  it("does not accept a key from another deployment environment", () => {
    expect(stripStorageEnvironmentPrefix("p/tenants/tenant_1", "staging")).toBe(
      "p/tenants/tenant_1",
    );
  });

  it("keeps legacy unprefixed keys compatible with test adapters", () => {
    expect(stripStorageEnvironmentPrefix("tenants/tenant_1", "staging")).toBe(
      "tenants/tenant_1",
    );
  });
});
