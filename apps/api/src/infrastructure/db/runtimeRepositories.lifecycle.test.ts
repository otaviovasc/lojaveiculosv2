import { describe, expect, it, vi } from "vitest";
import {
  createRuntimeAppDependencies,
  createRuntimeAppOptions,
} from "./runtimeRepositories.js";
import { createRuntimeBillingServicePorts } from "./runtimeAppOptions.js";

const TEST_CRM_CONNECTION_CREDENTIAL_ENCRYPTION_KEY = "test-only-key";

const postgresState = vi.hoisted(() => ({
  clients: [] as Array<{
    end: ReturnType<typeof vi.fn>;
    unsafe: ReturnType<typeof vi.fn>;
  }>,
}));

const crmRealtimeState = vi.hoisted(() => ({
  close: vi.fn(async () => undefined),
  ready: vi.fn(async () => undefined),
}));

vi.mock("postgres", () => ({
  default: vi.fn(() => {
    const client = {
      end: vi.fn(async () => undefined),
      unsafe: vi.fn(async () => undefined),
    };
    postgresState.clients.push(client);
    return client;
  }),
}));

vi.mock("../crm/redisCrmRealtimeBroker.js", () => ({
  createRuntimeCrmRealtimeBroker: vi.fn(
    (env: Record<string, string | undefined>) => ({
      close: crmRealtimeState.close,
      issueTicket: vi.fn(),
      publish: vi.fn(),
      ready: crmRealtimeState.ready,
      replay: vi.fn(),
      resolveTicket: vi.fn(),
      subscribe: vi.fn(),
    }),
  ),
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
      CRM_CONNECTION_CREDENTIAL_ENCRYPTION_KEY:
        TEST_CRM_CONNECTION_CREDENTIAL_ENCRYPTION_KEY,
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

  it("passes PUBLIC_APP_URL into DB-backed billing checkout ports", () => {
    const ports = createRuntimeBillingServicePorts(
      {},
      {
        APP_ENV: "local",
        PUBLIC_APP_URL: " http://localhost:5173 ",
      },
    );

    expect(ports.publicAppUrl).toBe("http://localhost:5173");
  });

  it("wires plan hiring into DB-backed billing services", () => {
    const ports = createRuntimeBillingServicePorts(
      {},
      {
        APP_ENV: "local",
      },
    );

    expect(ports.billingPlanHireRepository).toBeDefined();
  });

  it("rejects DB-backed app-options creation because the caller cannot close resources", async () => {
    postgresState.clients.length = 0;

    expect(() =>
      createRuntimeAppOptions({
        APP_ENV: "local",
        AUDIT_DATABASE_URL: "postgresql://audit:audit@localhost:54322/audit",
        CRM_CONNECTION_CREDENTIAL_ENCRYPTION_KEY:
          TEST_CRM_CONNECTION_CREDENTIAL_ENCRYPTION_KEY,
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

  it("includes Redis broker health in runtime readiness", async () => {
    postgresState.clients.length = 0;
    crmRealtimeState.close.mockClear();
    crmRealtimeState.ready.mockClear();
    crmRealtimeState.ready.mockRejectedValueOnce(
      new Error("redis unavailable"),
    );
    const runtime = createRuntimeAppDependencies({
      APP_ENV: "local",
      AUDIT_DATABASE_URL: "postgresql://audit:audit@localhost:54322/audit",
      CRM_CONNECTION_CREDENTIAL_ENCRYPTION_KEY:
        TEST_CRM_CONNECTION_CREDENTIAL_ENCRYPTION_KEY,
      DATABASE_URL: "postgresql://product:product@localhost:54321/product",
      NODE_ENV: "development",
      REDIS_URL: "redis://localhost:63790",
    });

    await expect(runtime.appOptions.readiness?.()).resolves.toEqual({
      checks: {
        auditDatabase: "ready",
        crmRealtime: "not_ready",
        productDatabase: "ready",
      },
      ok: false,
    });
    expect(crmRealtimeState.ready).toHaveBeenCalledOnce();
    await runtime.close();
    expect(crmRealtimeState.close).toHaveBeenCalledOnce();
  });
});
