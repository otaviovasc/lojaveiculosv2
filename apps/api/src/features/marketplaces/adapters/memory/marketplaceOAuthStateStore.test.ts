import { describe, expect, it } from "vitest";
import { createMemoryMarketplaceOAuthStateStore } from "./marketplaceOAuthStateStore.js";

describe("memory marketplace OAuth state store", () => {
  it("binds state to actor, store, tenant, provider, redirect and expiry", async () => {
    const store = createMemoryMarketplaceOAuthStateStore({
      createId: () => "11111111-1111-4111-8111-111111111111",
      createState: () => "opaque_state_value_12345678901234567890",
    });
    const expiresAt = new Date("2026-08-11T12:10:00.000Z");
    const issued = await store.issue({
      actorId: "user_1",
      expiresAt,
      provider: "olx",
      redirectUri:
        "http://localhost:5173/api/v1/marketplaces/oauth/olx/callback",
      requestId: "request_1",
      storeId: "store_1",
      tenantId: "tenant_1",
    });

    await expect(
      store.consumePending({
        binding: { actorId: "user_2" },
        state: issued.state,
        usedAt: new Date("2026-08-11T12:05:00.000Z"),
      }),
    ).resolves.toBeNull();
    await expect(
      store.consumePending({
        binding: {
          actorId: "user_1",
          provider: "olx",
          redirectUri:
            "http://localhost:5173/api/v1/marketplaces/oauth/olx/callback",
          storeId: "store_1",
          tenantId: "tenant_1",
        },
        state: issued.state,
        usedAt: expiresAt,
      }),
    ).resolves.toBeNull();
  });

  it("does not lease a received authorization code across tenant boundaries", async () => {
    const store = createMemoryMarketplaceOAuthStateStore({
      createId: () => "11111111-1111-4111-8111-111111111111",
      createState: () => "opaque_state_value_12345678901234567890",
    });
    const issued = await store.issue({
      actorId: "user_1",
      expiresAt: new Date("2026-08-11T12:10:00.000Z"),
      provider: "olx",
      redirectUri: "https://v2.example/callback",
      requestId: "request_1",
      storeId: "store_1",
      tenantId: "tenant_1",
    });
    await store.receiveCallback({
      authorizationCode: "authorization_code",
      binding: { provider: "olx" },
      receivedAt: new Date("2026-08-11T12:01:00.000Z"),
      state: issued.state,
    });
    await expect(
      store.claimReceived({
        binding: {
          actorId: "user_1",
          storeId: "store_1",
          tenantId: "tenant_2",
        },
        leaseExpiresAt: new Date("2026-08-11T12:03:00.000Z"),
        leaseOwner: "lease_1",
        transactionId: issued.id,
        usedAt: new Date("2026-08-11T12:02:00.000Z"),
      }),
    ).resolves.toBeNull();
    await expect(
      store.claimReceived({
        binding: {
          actorId: "user_1",
          storeId: "store_1",
          tenantId: "tenant_1",
        },
        leaseExpiresAt: new Date("2026-08-11T12:03:00.000Z"),
        leaseOwner: "lease_1",
        transactionId: issued.id,
        usedAt: new Date("2026-08-11T12:02:00.000Z"),
      }),
    ).resolves.toMatchObject({
      authorizationCode: "authorization_code",
      exchangeToken: null,
    });
  });
});
