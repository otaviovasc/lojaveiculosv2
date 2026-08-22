import { describe, expect, it, vi } from "vitest";
import type { StoreAccessRecord } from "../../ports/storeAccessRepository.js";
import { resolveStoreContext } from "./resolveStoreContext.js";

describe("resolveStoreContext agency store access", () => {
  it("grants full store operations to an active tenant agency member", async () => {
    const context = await resolveAgencyContext();

    expect(context).toMatchObject({
      billingManagedBy: "agency",
      membershipRole: "agency",
      storeId: "store_1",
      tenantId: "tenant_1",
    });
    expect(context.permissions).toEqual(
      expect.arrayContaining([
        "crm.conversations.read",
        "external_api.manage",
        "finance.read",
        "financing.simulation.read",
        "fiscal.document.issue",
        "inventory.read",
        "sale.read",
      ]),
    );
  });
});

async function resolveAgencyContext() {
  const access: StoreAccessRecord = {
    accessOrigin: "tenant_agency_fallback",
    billingManagedBy: "agency",
    entitlements: ["crm", "external_api", "fiscal"],
    overrides: [],
    role: "agency",
    storeId: "store_1" as never,
    tenantId: "tenant_1" as never,
    userId: "user_1" as never,
  };

  return resolveStoreContext({
    actor: { id: "user_1", kind: "user" },
    audit: { record: vi.fn(async () => undefined) },
    clerkUserId: "clerk_1",
    logger: { error: vi.fn(), info: vi.fn(), warn: vi.fn() },
    repository: { findByClerkUserAndStoreSlug: vi.fn(async () => access) },
    requestId: "req_1",
    storeSlug: "demo",
  });
}
