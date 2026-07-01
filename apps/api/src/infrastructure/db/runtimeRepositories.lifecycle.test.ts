import { describe, expect, it, vi } from "vitest";
import {
  createRuntimeAppDependencies,
  createRuntimeAppOptions,
} from "./runtimeRepositories.js";

const postgresState = vi.hoisted(() => ({
  clients: [] as Array<{ end: ReturnType<typeof vi.fn> }>,
}));

vi.mock("postgres", () => ({
  default: vi.fn(() => {
    const client = {
      end: vi.fn(async () => undefined),
    };
    postgresState.clients.push(client);
    return client;
  }),
}));

vi.mock("drizzle-orm/postgres-js", () => ({
  drizzle: vi.fn((client: unknown) => ({ $client: client })),
}));

describe("createRuntimeAppDependencies", () => {
  it("returns an idempotent closer for product and audit database pools", async () => {
    postgresState.clients.length = 0;

    const runtime = createRuntimeAppDependencies({
      APP_ENV: "local",
      AUDIT_DATABASE_URL: "postgresql://audit:audit@localhost:54322/audit",
      DATABASE_URL: "postgresql://product:product@localhost:54321/product",
      DB_CLOSE_TIMEOUT_SECONDS: "7",
      NODE_ENV: "development",
    });

    expect(postgresState.clients).toHaveLength(2);

    await runtime.close();
    await runtime.close();

    expect(postgresState.clients[0]?.end).toHaveBeenCalledTimes(1);
    expect(postgresState.clients[0]?.end).toHaveBeenCalledWith({
      timeout: 7,
    });
    expect(postgresState.clients[1]?.end).toHaveBeenCalledTimes(1);
    expect(postgresState.clients[1]?.end).toHaveBeenCalledWith({
      timeout: 7,
    });
  });

  it("does not allocate runtime resources when local memory fallback is active", async () => {
    postgresState.clients.length = 0;

    const runtime = createRuntimeAppDependencies({ APP_ENV: "local" });

    expect(runtime.resources).toEqual([]);
    expect(postgresState.clients).toEqual([]);
    await expect(runtime.close()).resolves.toBeUndefined();
  });

  it("rejects DB-backed app-options creation because the caller cannot close resources", async () => {
    postgresState.clients.length = 0;

    expect(() =>
      createRuntimeAppOptions({
        APP_ENV: "local",
        AUDIT_DATABASE_URL: "postgresql://audit:audit@localhost:54322/audit",
        DATABASE_URL: "postgresql://product:product@localhost:54321/product",
        NODE_ENV: "development",
      }),
    ).toThrow("createRuntimeAppDependencies");
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(postgresState.clients[0]?.end).toHaveBeenCalledOnce();
    expect(postgresState.clients[1]?.end).toHaveBeenCalledOnce();
  });

  it("validates production object storage before allocating database pools", () => {
    postgresState.clients.length = 0;

    expect(() =>
      createRuntimeAppDependencies({
        APP_ENV: "production",
        AUDIT_DATABASE_URL: "postgresql://audit:audit@localhost:54322/audit",
        CLERK_AUTHORIZED_PARTIES: "https://app.example.com",
        CLERK_SECRET_KEY: "sk_test_fake",
        DATABASE_URL: "postgresql://product:product@localhost:54321/product",
        NODE_ENV: "production",
      }),
    ).toThrow("R2 object storage must be configured");
    expect(postgresState.clients).toEqual([]);
  });
});
