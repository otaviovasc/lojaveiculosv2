import { describe, expect, it, vi } from "vitest";
import type { MarketplaceOlxCrmOnboarding } from "../../../domains/marketplace/ports/marketplaceOlxCrmOnboarding.js";
import {
  createGateway,
  createTestApp,
  post,
} from "./marketplace.controller.testSupport.js";

async function completeOlxOAuth(
  app: ReturnType<typeof createTestApp>,
  code: string,
) {
  const start = await post(app, "/connect-url", { provider: "olx" });
  const state = new URL(
    ((await start.json()) as { authorizationUrl: string }).authorizationUrl,
  ).searchParams.get("state");
  const callback = await app.request(
    `/api/v1/marketplaces/oauth/olx/callback?code=${code}&state=${state}`,
  );
  const transactionId = new URL(
    callback.headers.get("location") ?? "",
    "http://localhost",
  ).searchParams.get("transactionId");
  return post(app, "/oauth/complete", { transactionId });
}

describe("marketplace OAuth OLX capabilities", () => {
  it("keeps stock connected when CRM onboarding runtime is unavailable", async () => {
    const gateway = createGateway();
    let attempts = 0;
    const app = createTestApp({
      gateway,
      olxCrmOnboarding: {
        onboard: async () => {
          attempts += 1;
          throw new Error("webhook registration unavailable");
        },
      },
    });
    const response = await completeOlxOAuth(app, "single_exchange_code");
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({
      capabilities: {
        chat: {
          grantState: "granted",
          reason: "runtime_unavailable",
          status: "error",
        },
        leads: {
          grantState: "granted",
          reason: "runtime_unavailable",
          status: "error",
        },
        stock: { grantState: "granted", status: "active" },
      },
      kind: "partial",
    });
    expect(gateway.tokenRequests).toHaveLength(1);
    expect(attempts).toBe(1);
  });

  it("keeps stock active while CRM capabilities are blocked by access", async () => {
    const gateway = createGateway();
    const app = createTestApp({ gateway, permissions: ["marketplace.manage"] });
    const response = await completeOlxOAuth(app, "denied_code");
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({
      capabilities: {
        chat: {
          grantState: "granted",
          reason: "access_denied",
          status: "blocked",
        },
        leads: {
          grantState: "granted",
          reason: "access_denied",
          status: "blocked",
        },
        stock: { grantState: "granted", status: "active" },
      },
      kind: "partial",
    });
    expect(gateway.tokenRequests).toHaveLength(1);
  });

  it("keeps stock active while CRM capabilities lack entitlement", async () => {
    const gateway = createGateway();
    const app = createTestApp({ gateway, entitlements: ["marketplace"] });
    const response = await completeOlxOAuth(app, "denied_entitlement");
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({
      capabilities: {
        chat: {
          grantState: "granted",
          reason: "access_denied",
          status: "blocked",
        },
        leads: {
          grantState: "granted",
          reason: "access_denied",
          status: "blocked",
        },
        stock: { grantState: "granted", status: "active" },
      },
      kind: "partial",
    });
    expect(gateway.tokenRequests).toHaveLength(1);
  });

  it("persists blocked stock without dropping granted chat and leads", async () => {
    const gateway = createGateway({
      scope: "basic_user_info autoservice chat",
    });
    const persistCapabilities = vi.fn<
      NonNullable<MarketplaceOlxCrmOnboarding["persistCapabilities"]>
    >(async () => undefined);
    const app = createTestApp({
      gateway,
      olxCrmOnboarding: {
        onboard: async () => ({
          capabilities: {
            chat: {
              capability: "messaging",
              grantState: "granted",
              reason: null,
              status: "active",
            },
            leads: {
              capability: "lead_ingestion",
              grantState: "granted",
              reason: null,
              status: "active",
            },
          },
          connectionId: "olx_connection_1",
          status: "active",
        }),
        persistCapabilities,
      },
    });
    const response = await completeOlxOAuth(app, "scope_code");
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({
      account: { status: "active" },
      capabilities: {
        chat: { grantState: "granted", status: "active" },
        leads: { grantState: "granted", status: "active" },
        stock: {
          grantState: "denied",
          reason: "missing_scope",
          status: "blocked",
        },
      },
      kind: "partial",
    });
    expect(persistCapabilities).toHaveBeenCalledTimes(1);
    const persisted = persistCapabilities.mock.calls[0]?.[1];
    expect(persisted).toBeDefined();
    if (!persisted) throw new Error("OLX capabilities were not persisted.");
    expect(typeof persisted.authorizationId).toBe("string");
    expect(persisted.capabilities.chat.grantState).toBe("granted");
    expect(persisted.capabilities.leads.grantState).toBe("granted");
    expect(persisted.capabilities.stock.grantState).toBe("denied");
    expect(persisted.grantedScopes).toEqual([
      "autoservice",
      "basic_user_info",
      "chat",
    ]);
  });
});
