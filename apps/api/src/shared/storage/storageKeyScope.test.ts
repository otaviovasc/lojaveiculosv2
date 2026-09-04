import { describe, expect, it } from "vitest";
import {
  isStorageKeyInEnvironment,
  stripStorageEnvironmentPrefix,
} from "./storageKeyScope.js";

describe("isStorageKeyInEnvironment", () => {
  it.each([
    ["l", "local"],
    ["s", "staging"],
    ["p", "production"],
  ])("accepts a %s-prefixed key for %s", (prefix, environment) => {
    expect(
      isStorageKeyInEnvironment(`${prefix}/tenants/tenant_1`, environment),
    ).toBe(true);
  });

  it("rejects missing and foreign prefixes when the environment is known", () => {
    expect(isStorageKeyInEnvironment("tenants/tenant_1", "staging")).toBe(
      false,
    );
    expect(isStorageKeyInEnvironment("p/tenants/tenant_1", "staging")).toBe(
      false,
    );
  });

  it("keeps adapter-only test contexts permissive when no environment is set", () => {
    expect(isStorageKeyInEnvironment("tenants/tenant_1", undefined)).toBe(true);
  });
});

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
