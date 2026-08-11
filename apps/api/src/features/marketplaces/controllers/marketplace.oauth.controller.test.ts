import { describe, expect, it } from "vitest";
import {
  createGateway,
  createTestApp,
  post,
} from "./marketplace.controller.testSupport.js";

describe("marketplace OAuth controller", () => {
  it("uses the server-owned OLX redirect and completes the staged callback once", async () => {
    const gateway = createGateway();
    const app = createTestApp({ gateway });
    const start = await post(app, "/connect-url", { provider: "olx" });

    expect(start.status).toBe(200);
    const startBody = (await start.json()) as { authorizationUrl: string };
    const authorizationUrl = new URL(startBody.authorizationUrl);
    const state = authorizationUrl.searchParams.get("state");
    expect(state).toMatch(/^[A-Za-z0-9_-]{32,}$/);
    expect(() => {
      JSON.parse(state ?? "");
    }).toThrow();
    expect(authorizationUrl.searchParams.get("redirect_uri")).toBe(
      "http://localhost:5173/api/v1/marketplaces/oauth/olx/callback",
    );

    const callback = await app.request(
      `/api/v1/marketplaces/oauth/olx/callback?code=authorization_code_123&state=${state}`,
    );
    expect(callback.status).toBe(302);
    const location = callback.headers.get("location");
    expect(location).toContain("marketplaceOauth=pending");
    expect(location).not.toContain("authorization_code_123");
    const transactionId = new URL(
      location ?? "",
      "http://localhost",
    ).searchParams.get("transactionId");
    expect(transactionId).toBeTruthy();

    const complete = await post(app, "/oauth/complete", { transactionId });
    expect(complete.status).toBe(200);
    expect(await complete.json()).toMatchObject({
      account: { provider: "olx", storeId: "store_1", tenantId: "tenant_1" },
      kind: "connected",
    });
    expect(gateway.tokenRequests).toEqual([
      {
        code: "authorization_code_123",
        redirectUri:
          "http://localhost:5173/api/v1/marketplaces/oauth/olx/callback",
      },
    ]);

    const replay = await post(app, "/oauth/complete", { transactionId });
    expect(replay.status).toBe(400);
    expect(await replay.json()).toMatchObject({
      code: "MARKETPLACE_OAUTH_STATE_INVALID",
    });
  });

  it("rejects tampered state without calling the provider", async () => {
    const gateway = createGateway();
    const app = createTestApp({ gateway });
    const callback = await app.request(
      "/api/v1/marketplaces/oauth/olx/callback?code=authorization_code_123&state=aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
    );

    expect(callback.status).toBe(302);
    expect(callback.headers.get("location")).toBe(
      "/dashboard?marketplaceOauth=error&provider=olx#/marketplaces",
    );
    expect(gateway.tokenRequests).toEqual([]);
  });

  it("retries a transient code exchange without consuming or replaying the code", async () => {
    const gateway = createGateway({ failTokenExchangeOnce: true });
    const app = createTestApp({ gateway });
    const start = await post(app, "/connect-url", { provider: "olx" });
    const state = new URL(
      ((await start.json()) as { authorizationUrl: string }).authorizationUrl,
    ).searchParams.get("state");
    const callback = await app.request(
      `/api/v1/marketplaces/oauth/olx/callback?code=retry_code&state=${state}`,
    );
    const transactionId = new URL(
      callback.headers.get("location") ?? "",
      "http://localhost",
    ).searchParams.get("transactionId");

    expect((await post(app, "/oauth/complete", { transactionId })).status).toBe(
      500,
    );
    expect((await post(app, "/oauth/complete", { transactionId })).status).toBe(
      200,
    );
    expect((await post(app, "/oauth/complete", { transactionId })).status).toBe(
      400,
    );
    expect(gateway.tokenRequests).toHaveLength(2);
  });

  it("retries onboarding after token exchange without replaying the authorization code", async () => {
    const gateway = createGateway();
    let attempts = 0;
    const app = createTestApp({
      gateway,
      olxCrmOnboarding: {
        onboard: async () => {
          attempts += 1;
          if (attempts === 1)
            throw new Error("webhook registration unavailable");
          return { connectionId: "olx_connection_1", status: "active" };
        },
      },
    });
    const start = await post(app, "/connect-url", { provider: "olx" });
    const state = new URL(
      ((await start.json()) as { authorizationUrl: string }).authorizationUrl,
    ).searchParams.get("state");
    const callback = await app.request(
      `/api/v1/marketplaces/oauth/olx/callback?code=single_exchange_code&state=${state}`,
    );
    const transactionId = new URL(
      callback.headers.get("location") ?? "",
      "http://localhost",
    ).searchParams.get("transactionId");
    expect((await post(app, "/oauth/complete", { transactionId })).status).toBe(
      500,
    );
    expect((await post(app, "/oauth/complete", { transactionId })).status).toBe(
      200,
    );
    expect(gateway.tokenRequests).toHaveLength(1);
  });

  it("denies missing CRM setup access before token exchange", async () => {
    const gateway = createGateway();
    const app = createTestApp({ gateway, permissions: ["marketplace.manage"] });
    const start = await post(app, "/connect-url", { provider: "olx" });
    const state = new URL(
      ((await start.json()) as { authorizationUrl: string }).authorizationUrl,
    ).searchParams.get("state");
    const callback = await app.request(
      `/api/v1/marketplaces/oauth/olx/callback?code=denied_code&state=${state}`,
    );
    const transactionId = new URL(
      callback.headers.get("location") ?? "",
      "http://localhost",
    ).searchParams.get("transactionId");

    expect((await post(app, "/oauth/complete", { transactionId })).status).toBe(
      403,
    );
    expect(gateway.tokenRequests).toEqual([]);
  });

  it("denies missing CRM entitlement before token exchange", async () => {
    const gateway = createGateway();
    const app = createTestApp({ gateway, entitlements: ["marketplace"] });
    const start = await post(app, "/connect-url", { provider: "olx" });
    const state = new URL(
      ((await start.json()) as { authorizationUrl: string }).authorizationUrl,
    ).searchParams.get("state");
    const callback = await app.request(
      `/api/v1/marketplaces/oauth/olx/callback?code=denied_entitlement&state=${state}`,
    );
    const transactionId = new URL(
      callback.headers.get("location") ?? "",
      "http://localhost",
    ).searchParams.get("transactionId");
    expect((await post(app, "/oauth/complete", { transactionId })).status).toBe(
      403,
    );
    expect(gateway.tokenRequests).toEqual([]);
  });

  it("fails closed when OLX omits identity or autoupload scopes", async () => {
    const gateway = createGateway({ scope: "autoservice chat" });
    const app = createTestApp({ gateway });
    const start = await post(app, "/connect-url", { provider: "olx" });
    const state = new URL(
      ((await start.json()) as { authorizationUrl: string }).authorizationUrl,
    ).searchParams.get("state");
    const callback = await app.request(
      `/api/v1/marketplaces/oauth/olx/callback?code=scope_code&state=${state}`,
    );
    const transactionId = new URL(
      callback.headers.get("location") ?? "",
      "http://localhost",
    ).searchParams.get("transactionId");

    expect((await post(app, "/oauth/complete", { transactionId })).status).toBe(
      400,
    );
  });

  it("consumes provider cancellation state without exposing the provider error", async () => {
    const app = createTestApp();
    const start = await post(app, "/connect-url", { provider: "olx" });
    const startBody = (await start.json()) as { authorizationUrl: string };
    const state = new URL(startBody.authorizationUrl).searchParams.get("state");
    const callback = await app.request(
      `/api/v1/marketplaces/oauth/olx/callback?error=access_denied&state=${state}`,
    );

    expect(callback.status).toBe(302);
    expect(callback.headers.get("location")).toBe(
      "/dashboard?marketplaceOauth=cancelled&provider=olx#/marketplaces",
    );
  });
});
