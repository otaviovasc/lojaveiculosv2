import { describe, expect, it } from "vitest";
import {
  assertDistinctDatabaseTargets,
  parseResetCommand,
  resolveResettableEnvironment,
} from "./resetEnvironmentSafety.js";

describe("non-production reset safety", () => {
  it("defaults to a staging dry-run", () => {
    expect(parseResetCommand([], { APP_ENV: "staging" })).toEqual({
      apply: false,
      environment: "staging",
    });
  });

  it("requires the exact environment confirmation before applying", () => {
    expect(() =>
      parseResetCommand(["--apply"], { APP_ENV: "staging" }),
    ).toThrow("--confirm=staging");
    expect(
      parseResetCommand(["--apply", "--confirm=staging"], {
        APP_ENV: "staging",
        RAILWAY_ENVIRONMENT_NAME: "staging",
      }),
    ).toEqual({ apply: true, environment: "staging" });
  });

  it.each([
    { APP_ENV: "production" },
    { APP_ENV: "staging", RAILWAY_ENVIRONMENT_NAME: "production" },
    { APP_ENV: "production", RAILWAY_ENVIRONMENT_NAME: "staging" },
  ])("permanently rejects production signals", (env) => {
    expect(() => resolveResettableEnvironment(env)).toThrow(
      "permanently disabled in production",
    );
  });

  it("rejects local execution inside Railway and mismatched environments", () => {
    expect(() =>
      resolveResettableEnvironment({
        APP_ENV: "local",
        RAILWAY_ENVIRONMENT_NAME: "staging",
      }),
    ).toThrow("cannot run inside a Railway");
    expect(() =>
      resolveResettableEnvironment({
        APP_ENV: "staging",
        RAILWAY_ENVIRONMENT_NAME: "preview",
      }),
    ).toThrow("do not match");
  });

  it("does not confuse an opaque Railway environment id with its name", () => {
    expect(
      resolveResettableEnvironment({
        APP_ENV: "staging",
        RAILWAY_ENVIRONMENT: "3e8b2a6d-opaque-id",
      }),
    ).toBe("staging");
  });

  it("rejects product and audit URLs that resolve to the same database", () => {
    expect(() =>
      assertDistinctDatabaseTargets(
        "postgres://product:one@db.internal:5432/app",
        "postgres://audit:two@db.internal:5432/app",
      ),
    ).toThrow("must target different databases");
    expect(() =>
      assertDistinctDatabaseTargets(
        "postgres://product:one@product.internal:5432/app",
        "postgres://audit:two@audit.internal:5432/audit",
      ),
    ).not.toThrow();
  });
});
