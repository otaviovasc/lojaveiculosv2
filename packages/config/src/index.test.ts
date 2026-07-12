import { describe, expect, it } from "vitest";
import { parseEnv } from "./index.js";

describe("parseEnv", () => {
  it("applies safe local defaults", () => {
    expect(parseEnv({ DATABASE_URL: "postgresql://localhost/app" })).toEqual({
      APP_ENV: "local",
      DATABASE_URL: "postgresql://localhost/app",
      LOG_LEVEL: "info",
      NODE_ENV: "development",
    });
  });

  it("normalizes an empty optional Redis URL", () => {
    expect(
      parseEnv({
        DATABASE_URL: "postgresql://localhost/app",
        REDIS_URL: "",
      }).REDIS_URL,
    ).toBeUndefined();
  });

  it("accepts explicitly configured production values", () => {
    expect(
      parseEnv({
        API_BASE_URL: "https://api.example.com",
        APP_ENV: "production",
        DATABASE_URL: "postgresql://db.example.com/app",
        LOG_LEVEL: "warn",
        NODE_ENV: "production",
        REDIS_URL: "redis://cache.example.com:6379",
      }),
    ).toMatchObject({
      APP_ENV: "production",
      LOG_LEVEL: "warn",
      NODE_ENV: "production",
    });
  });

  it.each([
    [{}, "DATABASE_URL"],
    [{ DATABASE_URL: "", APP_ENV: "local" }, "DATABASE_URL"],
    [
      { DATABASE_URL: "postgresql://localhost/app", APP_ENV: "staging" },
      "APP_ENV",
    ],
    [
      { DATABASE_URL: "postgresql://localhost/app", REDIS_URL: "cache" },
      "REDIS_URL",
    ],
  ])("rejects invalid environment input for %s", (input, _field) => {
    expect(() => parseEnv(input)).toThrow();
  });
});
