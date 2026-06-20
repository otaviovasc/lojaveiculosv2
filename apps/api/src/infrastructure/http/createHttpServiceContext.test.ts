import { Hono } from "hono";
import { afterEach, describe, expect, it, vi } from "vitest";
import type {
  StoreAccessRecord,
  StoreAccessRepository,
} from "../../domains/identity/ports/storeAccessRepository.js";
import { createHttpServiceContext } from "./createHttpServiceContext.js";

describe("createHttpServiceContext", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("keeps public routes on the existing placeholder context", async () => {
    const context = await captureContext(
      new Request("https://api.local/health", {
        headers: { "x-request-id": "req_public" },
      }),
    );

    const serviceContext = await createHttpServiceContext(context);

    expect(serviceContext.actor).toEqual({ id: "public", kind: "public" });
    expect(serviceContext.permissions).toEqual([
      "public",
      "public_storefront.lead_create",
      "public_storefront.read",
    ]);
    expect(serviceContext.storeId).toBeNull();
  });

  it("resolves authenticated store context from identity headers", async () => {
    const access: StoreAccessRecord = {
      entitlements: ["crm"],
      overrides: [{ allowed: true, permission: "inventory.update_price" }],
      role: "salesman",
      storeId: "store_1" as never,
      tenantId: "tenant_1" as never,
      userId: "user_1" as never,
    };
    const repository = {
      findByClerkUserAndStoreSlug: vi.fn(async () => access),
    };
    const audit = { record: vi.fn(async () => undefined) };
    const context = await captureContext(
      new Request("https://api.local/api/v1/inventory/listings", {
        headers: {
          "x-clerk-user-id": "clerk_1",
          "x-request-id": "req_1",
          "x-store-slug": "demo",
          "x-user-id": "user_1",
        },
      }),
    );

    const serviceContext = await createHttpServiceContext(context, {
      audit,
      repository,
    });

    expect(serviceContext.actor).toEqual({
      externalId: "clerk_1",
      id: "user_1",
      kind: "user",
    });
    expect(serviceContext.permissions).toContain("inventory.update_price");
    expect(serviceContext.storeId).toBe("store_1");
    expect(repository.findByClerkUserAndStoreSlug).toHaveBeenCalledWith({
      clerkUserId: "clerk_1",
      storeSlug: "demo",
    });
  });

  it("falls back to the public storefront subdomain for store scope", async () => {
    const access: StoreAccessRecord = {
      entitlements: ["subdomain"],
      overrides: [],
      role: "owner",
      storeId: "store_1" as never,
      tenantId: "tenant_1" as never,
      userId: "user_1" as never,
    };
    const repository: StoreAccessRepository = {
      findByClerkUserAndStoreSlug: vi.fn(async () => access),
    };
    const context = await captureContext(
      new Request("https://demo.lojaveiculos.com.br/api/v1/inventory", {
        headers: {
          host: "demo.lojaveiculos.com.br",
          "x-clerk-user-id": "clerk_1",
          "x-request-id": "req_1",
        },
      }),
    );

    await createHttpServiceContext(context, { repository });

    expect(repository.findByClerkUserAndStoreSlug).toHaveBeenCalledWith({
      clerkUserId: "clerk_1",
      storeSlug: "demo",
    });
  });

  it("resolves authenticated context from a verified Clerk bearer token", async () => {
    vi.stubEnv("APP_ENV", "production");
    const access: StoreAccessRecord = {
      entitlements: ["crm"],
      overrides: [],
      role: "owner",
      storeId: "store_1" as never,
      tenantId: "tenant_1" as never,
      userId: "user_1" as never,
    };
    const repository: StoreAccessRepository = {
      findByClerkUserAndStoreSlug: vi.fn(async () => access),
    };
    const identityVerifier = {
      verify: vi.fn(async () => ({ clerkUserId: "clerk_verified" })),
    };
    const context = await captureContext(
      new Request("https://api.local/api/v1/inventory", {
        headers: {
          authorization: "Bearer session_token",
          "x-request-id": "req_1",
          "x-store-slug": "demo",
        },
      }),
    );

    const serviceContext = await createHttpServiceContext(context, {
      identityVerifier,
      repository,
    });

    expect(serviceContext.actor).toEqual({
      externalId: "clerk_verified",
      id: "user_1",
      kind: "user",
    });
    expect(repository.findByClerkUserAndStoreSlug).toHaveBeenCalledWith({
      clerkUserId: "clerk_verified",
      storeSlug: "demo",
    });
  });

  it("maps verifier failures to authentication errors", async () => {
    vi.stubEnv("APP_ENV", "production");
    const repository: StoreAccessRepository = {
      findByClerkUserAndStoreSlug: vi.fn(),
    };
    const identityVerifier = {
      verify: vi.fn(async () => {
        throw new Error("bad token");
      }),
    };
    const context = await captureContext(
      new Request("https://api.local/api/v1/inventory", {
        headers: {
          authorization: "Bearer bad_token",
          "x-store-slug": "demo",
        },
      }),
    );

    await expect(
      createHttpServiceContext(context, { identityVerifier, repository }),
    ).rejects.toThrow("Invalid or expired Clerk token.");
  });

  it("fails closed when identity headers are present without a repository", async () => {
    const context = await captureContext(
      new Request("https://api.local/api/v1/inventory/listings", {
        headers: {
          "x-clerk-user-id": "clerk_1",
          "x-store-slug": "demo",
        },
      }),
    );

    await expect(createHttpServiceContext(context)).rejects.toThrow(
      "requires store access repository",
    );
  });

  it("rejects trusted identity headers outside local and test", async () => {
    vi.stubEnv("APP_ENV", "production");
    const context = await captureContext(
      new Request("https://api.local/api/v1/inventory/listings", {
        headers: {
          "x-clerk-user-id": "clerk_1",
          "x-store-slug": "demo",
        },
      }),
    );

    await expect(createHttpServiceContext(context)).rejects.toThrow(
      "Trusted identity headers are only accepted in local/test.",
    );
  });
});

async function captureContext(request: Request) {
  let captured: unknown;
  const app = new Hono();
  app.all("*", (context) => {
    captured = context;
    return context.json({ ok: true });
  });

  await app.request(request);
  return captured as Parameters<typeof createHttpServiceContext>[0];
}
