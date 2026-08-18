import type { StoreId, TenantId } from "@lojaveiculosv2/shared";
import { describe, expect, it, vi } from "vitest";
import { createMemoryCrmConnectionRepository } from "../adapters/memory/crmConnectionRepository.js";
import {
  connectionId,
  createConnection,
  customerStoreId,
  customerTenantId,
} from "./crm.channelConnections.setupRoutes.testSupport.js";
import { createTestApp } from "./crm.controller.testSupport.js";

describe("CRM customer connection setup routes", () => {
  it("lets a scoped customer admin request pairing without exposing credentials", async () => {
    const app = createTestApp({
      crmConnectionCredentialVault: {
        open: vi.fn(async ({ sealed }: { sealed: string }) =>
          sealed.replace(/^sealed:/, ""),
        ),
        seal: vi.fn(),
      },
      crmConnectionRepository: createMemoryCrmConnectionRepository([
        {
          ...createConnection("zapi", {
            mode: "stored",
            stored: {
              instanceId: "sealed:instance-secret",
              instanceToken: "sealed:token-secret",
            },
          }),
          status: "disconnected",
          storeId: customerStoreId,
          tenantId: customerTenantId,
        },
      ]),
      zapiConnectionSetupProvider: {
        getPairingCode: vi.fn(async () => ({
          code: "829-441",
          kind: "code" as const,
        })),
        getQrCode: vi.fn(async () => ({
          dataUri: "data:image/png;base64,pairing-qr",
          expiresInSeconds: 30,
        })),
        validateStatus: vi.fn(async () => ({
          connected: false,
          connectedPhone: null,
          smartphoneConnected: false,
        })),
      },
    });

    const qr = await app.request(
      `/api/v1/crm/channel-connections/${connectionId}/zapi/pairing/qr`,
      { method: "POST" },
    );
    const code = await app.request(
      `/api/v1/crm/channel-connections/${connectionId}/zapi/pairing/code`,
      {
        body: JSON.stringify({ phone: "5511999999999" }),
        headers: { "content-type": "application/json" },
        method: "POST",
      },
    );

    const qrBody: unknown = await qr.json();
    const codeBody: unknown = await code.json();
    expect(qr.status).toBe(200);
    expect(code.status).toBe(200);
    const qrRecord = jsonObject(qrBody);
    expect(typeof qrRecord.expiresAt).toBe("string");
    expect(qrRecord.qrCode).toBe("data:image/png;base64,pairing-qr");
    expect(codeBody).toEqual({ code: "829-441", requested: true });
    expect(JSON.stringify({ codeBody, qrBody })).not.toContain("secret");
  });

  it("denies customer pairing without the pairing permission", async () => {
    const app = createTestApp({ permissions: [] });
    const response = await app.request(
      `/api/v1/crm/channel-connections/${connectionId}/zapi/pairing/qr`,
      { method: "POST" },
    );
    expect(response.status).toBe(403);
  });

  it("does not let setup-only actors pair an existing connection", async () => {
    const app = createTestApp({
      permissions: ["crm.messaging.connection.setup"],
    });
    const response = await app.request(
      `/api/v1/crm/channel-connections/${connectionId}/zapi/pairing/qr`,
      { method: "POST" },
    );

    expect(response.status).toBe(403);
  });

  it("does not let pairing-only actors configure a new connection", async () => {
    const app = createTestApp({
      permissions: ["crm.messaging.connection.pair"],
    });
    const response = await app.request("/api/v1/crm/channel-connections", {
      body: JSON.stringify({
        channel: "whatsapp",
        instanceId: "instance-1",
        instanceToken: "instance-secret-1",
        provider: "zapi",
      }),
      headers: { "content-type": "application/json" },
      method: "POST",
    });

    expect(response.status).toBe(403);
  });

  it.each([
    [
      "another tenant",
      { storeId: "store_2" as StoreId, tenantId: "tenant_2" as TenantId },
    ],
    [
      "another provider",
      { broker: "composio" as const, provider: "meta_cloud" as const },
    ],
  ])("hides a Z-API pairing target from %s", async (_label, overrides) => {
    const app = createTestApp({
      crmConnectionRepository: createMemoryCrmConnectionRepository([
        {
          ...createConnection("zapi"),
          storeId: customerStoreId,
          tenantId: customerTenantId,
          ...overrides,
        },
      ]),
    });
    const response = await app.request(
      `/api/v1/crm/channel-connections/${connectionId}/zapi/pairing/qr`,
      { method: "POST" },
    );
    expect(response.status).toBe(404);
  });

  it("stores only the official connected-account reference", async () => {
    const repository = createMemoryCrmConnectionRepository([
      {
        ...createConnection("meta_cloud"),
        storeId: customerStoreId,
        tenantId: customerTenantId,
      },
    ]);
    const app = createTestApp({
      composioChannelOnboardingProvider: {
        createConnectLink: vi.fn(async () => ({
          connectedAccountId: "ca_test",
          expiresAt: "2026-08-09T14:00:00.000Z",
          redirectUrl: "https://connect.composio.dev/cycle/test",
        })),
        discoverWhatsappResources: vi.fn(),
        subscribeWhatsappApp: vi.fn(),
        verifyConnectedAccount: vi.fn(),
      },
      crmConnectionRepository: repository,
    });

    const response = await app.request(
      `/api/v1/crm/channel-connections/${connectionId}/composio/authorize`,
      { method: "POST" },
    );

    expect(response.status).toBe(200);
    await expect(
      repository.findConnectionById(connectionId),
    ).resolves.toMatchObject({
      credentialsRef: {
        composio: { connectedAccountId: "ca_test" },
        env: { apiKey: "COMPOSIO_API_KEY" },
        mode: "composio",
      },
    });
  });
});

function jsonObject(value: unknown): Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new TypeError("Expected JSON object response");
  }
  return value as Record<string, unknown>;
}
