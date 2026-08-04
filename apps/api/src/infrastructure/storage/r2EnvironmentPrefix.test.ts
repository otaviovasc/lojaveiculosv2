import { describe, expect, it } from "vitest";
import {
  assertR2StorageKeyEnvironment,
  resolveR2EnvironmentPrefix,
} from "./r2EnvironmentPrefix.js";

describe("R2 environment prefixes", () => {
  it.each([
    ["local", "l"],
    ["development", "l"],
    ["test", "l"],
    ["staging", "s"],
    ["production", "p"],
  ] as const)("maps APP_ENV=%s to %s/", (appEnvironment, expected) => {
    expect(resolveR2EnvironmentPrefix({ APP_ENV: appEnvironment })).toBe(
      expected,
    );
  });

  it("rejects missing and unknown application environments", () => {
    expect(() => resolveR2EnvironmentPrefix({})).toThrow("APP_ENV must be");
    expect(() => resolveR2EnvironmentPrefix({ APP_ENV: "preview" })).toThrow(
      "APP_ENV must be",
    );
  });

  it("accepts only keys owned by the current environment", () => {
    expect(() =>
      assertR2StorageKeyEnvironment("s/tenants/a", "s"),
    ).not.toThrow();
    expect(() => assertR2StorageKeyEnvironment("p/tenants/a", "s")).toThrow(
      "inside the s/ environment prefix",
    );
    expect(() =>
      assertR2StorageKeyEnvironment("staging/tenants/a", "s"),
    ).toThrow("inside the s/ environment prefix");
  });
});
