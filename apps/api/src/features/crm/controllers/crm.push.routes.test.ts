import { Hono } from "hono";
import { describe, expect, it } from "vitest";
import { createMemoryCrmPushRepository } from "../../../domains/crm/testSupportCrmPush.js";
import { createMemoryCrmRepository } from "../adapters/memory/crmRepository.js";
import { createServiceContext } from "../../../shared/serviceContext.js";
import { createCrmFeature } from "./crm.controller.js";
import { createTestApp, expectApiError } from "./crm.controller.testSupport.js";
import { createCrmServices } from "./crmServices.js";

const currentUserId = "02020202-0202-4202-8202-020202020202";
const otherUserId = "03030303-0303-4303-8303-030303030303";
const subscriptionId = "11111111-1111-4111-8111-111111111111";

describe("CRM push routes", () => {
  it("returns only the public runtime config and the current user's settings", async () => {
    const response = await createTestApp({
      pushPublicConfig: {
        appId: "22222222-2222-4222-8222-222222222222",
        deliveryMode: "shadow",
      },
    }).request("/api/v1/crm/push/settings");

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      appId: "22222222-2222-4222-8222-222222222222",
      deliveryMode: "shadow",
      preference: { enabled: true },
      subscription: null,
    });
  });

  it("registers, disables, and reads the current user's subscription", async () => {
    const repository = createMemoryCrmPushRepository();
    const app = createTestApp({ crmPushRepository: repository });

    const registered = await app.request(
      "/api/v1/crm/push/subscriptions",
      jsonRequest({ subscriptionId }),
    );
    expect(registered.status).toBe(204);
    const repeated = await app.request(
      "/api/v1/crm/push/subscriptions",
      jsonRequest({ subscriptionId }),
    );
    expect(repeated.status).toBe(204);

    const settings = await app.request("/api/v1/crm/push/settings");
    await expect(settings.json()).resolves.toMatchObject({
      preference: { enabled: true },
      subscription: { enabled: true, id: subscriptionId },
    });

    const disabled = await app.request(
      `/api/v1/crm/push/subscriptions/${subscriptionId}`,
      { method: "DELETE" },
    );
    expect(disabled.status).toBe(204);
    const afterDisable = await app.request("/api/v1/crm/push/settings");
    await expect(afterDisable.json()).resolves.toMatchObject({
      subscription: { enabled: false, id: subscriptionId },
    });
  });

  it("updates the preference only in the current store scope", async () => {
    const repository = createMemoryCrmPushRepository();
    const app = createTestApp({ crmPushRepository: repository });

    const response = await app.request(
      "/api/v1/crm/push/preferences",
      jsonRequest({ enabled: false }, "PATCH"),
    );
    expect(response.status).toBe(204);

    await expect(
      repository.getSettings({
        storeId: "store_1",
        tenantId: "tenant_1",
        userId: currentUserId,
      }),
    ).resolves.toMatchObject({ preferenceEnabled: false });
    await expect(
      repository.getSettings({
        storeId: "other_store",
        tenantId: "tenant_1",
        userId: currentUserId,
      }),
    ).resolves.toMatchObject({ preferenceEnabled: true });
  });

  it("transfers a shared browser subscription to the authenticated user", async () => {
    const repository = createMemoryCrmPushRepository();
    await repository.registerOrTransferSubscription({
      now: new Date("2026-08-24T12:00:00.000Z"),
      subscriptionId,
      userId: otherUserId,
    });
    const app = createTestApp({ crmPushRepository: repository });

    const response = await app.request(
      "/api/v1/crm/push/subscriptions",
      jsonRequest({ subscriptionId }),
    );
    expect(response.status).toBe(204);
    await expect(
      repository.getSettings({
        storeId: "store_1",
        tenantId: "tenant_1",
        userId: otherUserId,
      }),
    ).resolves.toMatchObject({ subscription: null });
    await expect(
      repository.getSettings({
        storeId: "store_1",
        tenantId: "tenant_1",
        userId: currentUserId,
      }),
    ).resolves.toMatchObject({
      subscription: { enabled: true, subscriptionId },
    });
  });

  it("does not disable a subscription owned by another user", async () => {
    const repository = createMemoryCrmPushRepository();
    await repository.registerOrTransferSubscription({
      now: new Date("2026-08-24T12:00:00.000Z"),
      subscriptionId,
      userId: otherUserId,
    });
    const response = await createTestApp({
      crmPushRepository: repository,
    }).request(`/api/v1/crm/push/subscriptions/${subscriptionId}`, {
      method: "DELETE",
    });

    expect(response.status).toBe(204);
    await expect(
      repository.getSettings({
        storeId: "store_1",
        tenantId: "tenant_1",
        userId: otherUserId,
      }),
    ).resolves.toMatchObject({
      subscription: { enabled: true, subscriptionId },
    });
  });

  it("rejects malformed subscription and preference payloads", async () => {
    const app = createTestApp();
    const malformedSubscription = await app.request(
      "/api/v1/crm/push/subscriptions",
      jsonRequest({ subscriptionId: "not-a-subscription" }),
    );
    expect(malformedSubscription.status).toBe(400);

    const malformedParam = await app.request(
      "/api/v1/crm/push/subscriptions/not-a-subscription",
      { method: "DELETE" },
    );
    expect(malformedParam.status).toBe(400);

    const malformedPreference = await app.request(
      "/api/v1/crm/push/preferences",
      jsonRequest({ enabled: "yes" }, "PATCH"),
    );
    expect(malformedPreference.status).toBe(400);
  });

  it("requires conversation read permission and the CRM entitlement", async () => {
    const missingPermission = await createTestApp({
      permissions: [],
    }).request("/api/v1/crm/push/settings");
    expect(missingPermission.status).toBe(403);
    await expectApiError(missingPermission, {
      code: "AUTHORIZATION_DENIED",
      message: "Missing permission: crm.conversations.read",
    });

    const missingEntitlement = await createTestApp({
      entitlements: [],
    }).request("/api/v1/crm/push/settings");
    expect(missingEntitlement.status).toBe(403);
    await expectApiError(missingEntitlement, {
      code: "AUTHORIZATION_DENIED",
      message: "Missing entitlement: crm",
    });
  });

  it("rejects unauthenticated actors and missing store scope", async () => {
    const unauthenticated = await createContextTestApp({
      actor: { id: "public", kind: "public" },
      storeId: null,
      tenantId: null,
    }).request("/api/v1/crm/push/settings");
    expect(unauthenticated.status).toBe(401);

    const missingScope = await createContextTestApp({
      actor: { id: currentUserId, kind: "user" },
      storeId: null,
      tenantId: null,
    }).request("/api/v1/crm/push/settings");
    expect(missingScope.status).toBe(400);
  });
});

function jsonRequest(body: Record<string, unknown>, method = "POST") {
  return {
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
    method,
  };
}

function createContextTestApp(input: {
  actor: { id: string; kind: "public" | "user" };
  storeId: string | null;
  tenantId: string | null;
}) {
  const app = new Hono();
  app.route(
    "/api/v1/crm",
    createCrmFeature({
      contextFactory: async () =>
        createServiceContext({
          actor: input.actor,
          entitlements: ["crm"],
          permissions: ["crm.conversations.read"],
          request: { requestId: "push_auth_req" },
          storeId: input.storeId,
          tenantId: input.tenantId,
        }),
      services: createCrmServices({
        ports: {
          crmPushRepository: createMemoryCrmPushRepository(),
          crmRepository: createMemoryCrmRepository(),
        },
      }),
    }),
  );
  return app;
}
