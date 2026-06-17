import { describe, expect, it } from "vitest";
import {
  createRuntimeAppOptions,
  RuntimeDatabaseConfigError,
} from "./runtimeRepositories.js";

describe("createRuntimeAppOptions", () => {
  it("allows memory repository fallback for local development", () => {
    expect(createRuntimeAppOptions({ APP_ENV: "local" })).toEqual({});
  });

  it("fails fast outside local/test when DATABASE_URL is missing", () => {
    expect(() =>
      createRuntimeAppOptions({
        APP_ENV: "production",
        NODE_ENV: "production",
      }),
    ).toThrow(RuntimeDatabaseConfigError);
  });

  it("fails fast outside local/test when Railway reference variables are unresolved", () => {
    expect(() =>
      createRuntimeAppOptions({
        APP_ENV: "production",
        DATABASE_URL: "${{Postgres.DATABASE_URL}}",
        NODE_ENV: "production",
      }),
    ).toThrow("DATABASE_URL must be configured");
  });

  it("fails fast outside local/test when audit DB URL is missing", () => {
    expect(() =>
      createRuntimeAppOptions({
        APP_ENV: "production",
        DATABASE_URL: "postgresql://user:pass@localhost:54321/app",
        NODE_ENV: "production",
      }),
    ).toThrow("AUDIT_DATABASE_URL must be configured");
  });

  it("fails fast outside local/test when audit DB Railway reference is unresolved", () => {
    expect(() =>
      createRuntimeAppOptions({
        APP_ENV: "production",
        AUDIT_DATABASE_URL: "${{AuditPostgres.DATABASE_URL}}",
        DATABASE_URL: "postgresql://user:pass@localhost:54321/app",
        NODE_ENV: "production",
      }),
    ).toThrow("AUDIT_DATABASE_URL must be configured");
  });

  it("fails fast outside local/test when Clerk secret is missing", () => {
    expect(() =>
      createRuntimeAppOptions({
        APP_ENV: "production",
        AUDIT_DATABASE_URL: "postgresql://user:pass@localhost:54322/audit",
        DATABASE_URL: "postgresql://user:pass@localhost:54321/app",
        NODE_ENV: "production",
      }),
    ).toThrow("CLERK_SECRET_KEY must be configured");
  });
});
