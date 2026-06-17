import { Hono } from "hono";
import { describe, expect, it, vi } from "vitest";
import type {
  StoreAccessRecord,
  StoreAccessRepository,
} from "../../domains/identity/ports/storeAccessRepository.js";
import { createHttpServiceContext } from "./createHttpServiceContext.js";

describe("createHttpServiceContext", () => {
  it("keeps public routes on the existing placeholder context", async () => {
    const context = await captureContext(
      new Request("https://api.local/health", {
        headers: { "x-request-id": "req_public" },
      }),
    );

    const serviceContext = await createHttpServiceContext(context);

    expect(serviceContext.actor).toEqual({ id: "public", kind: "public" });
    expect(serviceContext.permissions).toEqual(["public"]);
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
