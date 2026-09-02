import { afterEach, describe, expect, it, vi } from "vitest";
import type { CrmConnection } from "../../../domains/crm/ports/crmConnectionRepository.js";
import type {
  CrmMessagingConfigureWebhooksInput,
  CrmMessagingConfigureWebhooksResult,
  CrmMessagingGateway,
  CrmMessagingProviderStatus,
} from "../../../domains/crm/ports/crmMessagingGateway.js";
import { createMemoryCrmConnectionRepository } from "../adapters/memory/crmConnectionRepository.js";
import { createTestApp } from "./crm.controller.testSupport.js";
import {
  connectionId,
  createGateway,
  createSetupProvider,
  createUazapiConnection,
} from "./crm.channelConnections.uazapiSetup.testSupport.js";

describe("CRM uazapi channel connection setup routes", () => {
  const originalApiBaseUrl = process.env.API_BASE_URL;

  afterEach(() => {
    if (originalApiBaseUrl === undefined) delete process.env.API_BASE_URL;
    else process.env.API_BASE_URL = originalApiBaseUrl;
  });

  it("issues a pairing QR and kicks off webhook setup", async () => {
    const provider = createSetupProvider();
    const gateway = createGateway({});
    const repository = createMemoryCrmConnectionRepository([
      createUazapiConnection(),
    ]);
    const app = createTestApp({
      crmConnectionRepository: repository,
      crmMessagingGateway: gateway,
      uazapiConnectionSetupProvider: provider,
    });

    const response = await app.request(
      `/api/v1/crm/channel-connections/${connectionId}/uazapi/pairing/qr`,
      { method: "POST" },
    );

    expect(response.status).toBe(200);
    const body = (await response.json()) as {
      expiresAt: string;
      qrCode: string;
    };
    expect(body.qrCode).toBe("data:image/png;base64,uazapi-qr");
    expect(provider.getQrCode).toHaveBeenCalledTimes(1);
    expect(gateway.configureWebhooks).toHaveBeenCalledTimes(1);
    const persisted = await repository.findConnectionById(connectionId);
    expect(persisted?.metadata.uazapiWebhookSetup).toMatchObject({
      state: "configured",
    });
  });

  it("issues a pairing code using the connection phone", async () => {
    const provider = createSetupProvider();
    const app = createTestApp({
      crmConnectionRepository: createMemoryCrmConnectionRepository([
        createUazapiConnection(),
      ]),
      crmMessagingGateway: createGateway({}),
      uazapiConnectionSetupProvider: provider,
    });

    const response = await app.request(
      `/api/v1/crm/channel-connections/${connectionId}/uazapi/pairing/code`,
      {
        body: JSON.stringify({}),
        headers: { "content-type": "application/json" },
        method: "POST",
      },
    );

    expect(response.status).toBe(200);
    const body = (await response.json()) as {
      code?: string;
      expiresAt: string;
      requested: boolean;
    };
    expect(body).toMatchObject({ code: "1234-5678", requested: true });
    expect(provider.getPairingCode).toHaveBeenCalledWith(
      expect.anything(),
      "5511999990000",
    );
  });

  it("refuses pairing when the provider still reports a connected device", async () => {
    const provider = createSetupProvider({
      validateStatus: vi.fn(async () => ({
        connected: true,
        connectedPhone: "5511999990000",
        smartphoneConnected: true,
      })),
    });
    const app = createTestApp({
      crmConnectionRepository: createMemoryCrmConnectionRepository([
        createUazapiConnection(),
      ]),
      crmMessagingGateway: createGateway({}),
      uazapiConnectionSetupProvider: provider,
    });

    const response = await app.request(
      `/api/v1/crm/channel-connections/${connectionId}/uazapi/pairing/qr`,
      { method: "POST" },
    );

    expect(response.status).toBe(409);
    expect(await response.json()).toMatchObject({
      code: "CRM_CONNECTION_SETUP_PAIRING_DISCONNECT_REQUIRED",
    });
    expect(provider.getQrCode).not.toHaveBeenCalled();
  });

  it("configures the single uazapi webhook with the connection-bound secret", async () => {
    process.env.API_BASE_URL = "https://api.trusted.test";
    const gateway = createGateway({});
    const repository = createMemoryCrmConnectionRepository([
      createUazapiConnection(),
    ]);
    const app = createTestApp({
      crmConnectionRepository: repository,
      crmMessagingGateway: gateway,
      uazapiConnectionSetupProvider: createSetupProvider(),
    });

    const response = await app.request(
      `/api/v1/crm/channel-connections/${connectionId}/uazapi/webhooks/configure`,
      { method: "POST" },
    );

    expect(response.status).toBe(200);
    const body = (await response.json()) as {
      results: CrmMessagingConfigureWebhooksResult["results"];
      setup: { attemptCount: number; state: string };
      tokenApplied: boolean;
    };
    expect(body.setup).toMatchObject({ attemptCount: 1, state: "configured" });
    expect(body.tokenApplied).toBe(true);
    expect(gateway.configureWebhooks).toHaveBeenCalledTimes(1);
    const configureCalls = gateway.configureWebhooks.mock.calls as unknown as [
      CrmConnection,
      CrmMessagingConfigureWebhooksInput,
    ][];
    const webhook = configureCalls[0]?.[1].webhooks[0];
    expect(webhook?.type).toBe("uazapi");
    expect(webhook?.url).toBe(
      `https://api.trusted.test/api/v1/crm/whatsapp/webhooks/uazapi/${connectionId}?token=webhook-secret`,
    );
    expect(JSON.stringify(body)).not.toContain("webhook-secret");
    expect(JSON.stringify(body)).not.toContain("token=");
  });

  it("disconnects the provider session", async () => {
    const gateway = createGateway({});
    const repository = createMemoryCrmConnectionRepository([
      createUazapiConnection({ status: "active" }),
    ]);
    const app = createTestApp({
      crmConnectionRepository: repository,
      crmMessagingGateway: gateway,
      uazapiConnectionSetupProvider: createSetupProvider(),
    });

    const response = await app.request(
      `/api/v1/crm/channel-connections/${connectionId}/uazapi/disconnect`,
      { method: "POST" },
    );

    expect(response.status).toBe(200);
    expect(gateway.disconnectConnection).toHaveBeenCalledTimes(1);
    const persisted = await repository.findConnectionById(connectionId);
    expect(persisted?.status).toBe("disconnected");
  });

  it("refreshes the connection status from the provider", async () => {
    const gateway = createGateway({
      getConnectionStatus: vi.fn<CrmMessagingGateway["getConnectionStatus"]>(
        async (): Promise<CrmMessagingProviderStatus> => ({
          checkedAt: new Date("2026-08-12T12:00:00.000Z"),
          connected: true,
          connectedPhone: "5511999990000",
          providerStatus: "connected",
          smartphoneConnected: true,
        }),
      ),
    });
    const repository = createMemoryCrmConnectionRepository([
      createUazapiConnection({ status: "disconnected" }),
    ]);
    const app = createTestApp({
      crmConnectionRepository: repository,
      crmMessagingGateway: gateway,
      uazapiConnectionSetupProvider: createSetupProvider(),
    });

    const response = await app.request(
      `/api/v1/crm/channel-connections/${connectionId}/uazapi/status/refresh`,
      { method: "POST" },
    );

    expect(response.status).toBe(200);
    const persisted = await repository.findConnectionById(connectionId);
    expect(persisted?.status).toBe("active");
    expect(persisted?.phone).toBe("5511999990000");
  });

  it("requires setup permission and the base CRM entitlement", async () => {
    const target = createUazapiConnection();
    const path = `/api/v1/crm/channel-connections/${connectionId}/uazapi/webhooks/configure`;
    const withoutPermission = createTestApp({
      crmConnectionRepository: createMemoryCrmConnectionRepository([target]),
      permissions: [],
      uazapiConnectionSetupProvider: createSetupProvider(),
    });
    const withoutEntitlement = createTestApp({
      crmConnectionRepository: createMemoryCrmConnectionRepository([target]),
      entitlements: [],
      uazapiConnectionSetupProvider: createSetupProvider(),
    });

    expect(
      (await withoutPermission.request(path, { method: "POST" })).status,
    ).toBe(403);
    expect(
      (await withoutEntitlement.request(path, { method: "POST" })).status,
    ).toBe(403);
  });
});
