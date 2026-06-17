import { describe, expect, it, vi } from "vitest";
import {
  resolveStoreContext,
  StoreAccessDeniedError,
} from "./resolveStoreContext.js";
import type {
  StoreAccessRecord,
  StoreAccessRepository,
} from "../../ports/storeAccessRepository.js";

describe("resolveStoreContext", () => {
  it("resolves permissions, entitlements, tenant, store, and audit", async () => {
    const audit = { record: vi.fn(async () => undefined) };
    const access: StoreAccessRecord = {
      entitlements: ["crm", "subdomain"],
      overrides: [{ allowed: true, permission: "inventory.update_price" }],
      role: "salesman",
      storeId: "store_1" as never,
      tenantId: "tenant_1" as never,
      userId: "user_1" as never,
    };
    const repository: StoreAccessRepository = {
      findByClerkUserAndStoreSlug: vi.fn(async () => access),
    };

    const context = await resolveStoreContext({
      actor: { id: "user_1", kind: "user" },
      audit,
      clerkUserId: "clerk_1",
      logger: { error: vi.fn(), info: vi.fn(), warn: vi.fn() },
      repository,
      requestId: "req_1",
      storeSlug: "demo",
    });

    expect(context.storeId).toBe("store_1");
    expect(context.tenantId).toBe("tenant_1");
    expect(context.actor).toEqual({
      externalId: "clerk_1",
      id: "user_1",
      kind: "user",
    });
    expect(context.entitlements).toContain("crm");
    expect(context.permissions).toContain("inventory.update_price");
    expect(audit.record).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "identity.context.resolve",
        actor: {
          externalId: "clerk_1",
          id: "user_1",
          kind: "user",
        },
        requestId: "req_1",
      }),
    );
  });

  it("fails with a typed error when user cannot access store", async () => {
    const repository: StoreAccessRepository = {
      findByClerkUserAndStoreSlug: vi.fn(async () => null),
    };

    await expect(
      resolveStoreContext({
        actor: { id: "user_1", kind: "user" },
        audit: { record: vi.fn(async () => undefined) },
        clerkUserId: "clerk_1",
        logger: { error: vi.fn(), info: vi.fn(), warn: vi.fn() },
        repository,
        requestId: "req_1",
        storeSlug: "demo",
      }),
    ).rejects.toBeInstanceOf(StoreAccessDeniedError);
  });
});
