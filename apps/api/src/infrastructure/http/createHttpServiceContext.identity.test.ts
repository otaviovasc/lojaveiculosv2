import { Hono } from "hono";
import { describe, expect, it, vi } from "vitest";
import type {
  StoreAccessRecord,
  StoreAccessRepository,
} from "../../domains/identity/ports/storeAccessRepository.js";
import { createHttpServiceContext } from "./createHttpServiceContext.js";

describe("createHttpServiceContext actor identity", () => {
  it("does not trust an actor display name when the scoped user has no name", async () => {
    const access: StoreAccessRecord = {
      billingManagedBy: "store_owner",
      entitlements: ["crm"],
      overrides: [],
      role: "owner",
      storeId: "store_1" as never,
      tenantId: "tenant_1" as never,
      userId: "user_1" as never,
      userName: "   ",
    };
    const repository: StoreAccessRepository = {
      findByClerkUserAndStoreSlug: vi.fn(async () => access),
    };
    const context = await captureContext(
      new Request("https://api.local/api/v1/crm", {
        headers: {
          "x-clerk-user-id": "clerk_1",
          "x-store-slug": "demo",
          "x-user-name": "Spoofed Name",
        },
      }),
    );

    const serviceContext = await createHttpServiceContext(context, {
      repository,
    });

    expect(serviceContext.actor).not.toHaveProperty("displayName");
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
