import type { StoreId, TenantId } from "@lojaveiculosv2/shared";
import { describe, expect, it, vi } from "vitest";
import type { CrmConnection } from "../../../domains/crm/ports/crmConnectionRepository.js";
import type {
  CrmMessagingConfigureWebhooksInput,
  CrmMessagingConfigureWebhooksResult,
} from "../../../domains/crm/ports/crmMessagingGateway.js";
import { createMemoryCrmConnectionRepository } from "../adapters/memory/crmConnectionRepository.js";
import {
  createConnection,
  customerStoreId,
  customerTenantId,
} from "./crm.channelConnections.setupRoutes.testSupport.js";
import { createTestApp } from "./crm.controller.testSupport.js";

describe("CRM channel connection setup routes", () => {
  it("keeps Z-API discoverable but denies first configuration without entitlement", async () => {
    const app = createTestApp({
      entitlements: ["crm"],
      billingQuotaGuard: {
        assertAvailable: vi.fn(),
        getAllowance: vi.fn(async () => ({ limit: 0, remaining: 0, used: 0 })),
      },
    });
    const overview = await app.request("/api/v1/crm/channel-connections");
    expect(overview.status).toBe(200);
    const overviewBody: unknown = await overview.json();
    expect(jsonObject(overviewBody)).toMatchObject({
      allowance: { limit: 0, remaining: 0, used: 0 },
      availableSetups: arrayContaining([
        { broker: "direct", channel: "whatsapp", provider: "zapi" },
      ]),
      connections: [],
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

  it("encrypts authorized credentials and requires disconnect before pairing", async () => {
    const repository = createMemoryCrmConnectionRepository();
    const getQrCode = vi.fn(async () => ({
      dataUri: "data:image/png;base64,customer-qr",
      expiresInSeconds: 30,
    }));
    const configureWebhooks = vi.fn(
      async (
        _connection: CrmConnection,
        input: CrmMessagingConfigureWebhooksInput,
      ): Promise<CrmMessagingConfigureWebhooksResult> => ({
        results: input.webhooks.map((webhook) => ({
          error: null,
          ok: true,
          status: 200,
          type: webhook.type,
          url: webhook.url,
          verified: true,
        })),
      }),
    );
    const connectedStatus = {
      checkedAt: new Date("2026-08-12T12:00:00.000Z"),
      connected: true,
      connectedPhone: "5511999999999",
      providerStatus: "connected" as const,
      smartphoneConnected: true,
    };
    const app = createTestApp({
      billingQuotaGuard: {
        assertAvailable: vi.fn(async () => undefined),
        getAllowance: vi.fn(async () => ({ limit: 1, remaining: 1, used: 0 })),
      },
      crmConnectionCredentialVault: {
        open: vi.fn(async ({ sealed }: { sealed: string }) =>
          sealed.replace(/^sealed:[^:]+:/u, ""),
        ),
        seal: vi.fn(
          async ({ plaintext, purpose }) => `sealed:${purpose}:${plaintext}`,
        ),
      },
      crmConnectionRepository: repository,
      crmMessagingGateway: {
        configureWebhooks,
        getConnectionStatus: vi.fn(async () => connectedStatus),
      },
      zapiConnectionSetupProvider: {
        getPairingCode: vi.fn(),
        getQrCode,
        validateStatus: vi.fn(async () => ({
          connected: true,
          connectedPhone: "5511999999999",
          smartphoneConnected: true,
        })),
      },
    });
    const credentials = {
      channel: "whatsapp",
      instanceId: "instance-1",
      instanceToken: "instance-secret-1",
      provider: "zapi",
    } as const;

    const configured = await app.request("/api/v1/crm/channel-connections", {
      body: JSON.stringify(credentials),
      headers: { "content-type": "application/json" },
      method: "POST",
    });
    const configuredBody: unknown = await configured.json();
    const configuredId = jsonObject(configuredBody).id;
    expect(typeof configuredId).toBe("string");
    if (typeof configuredId !== "string") {
      throw new TypeError("Expected configured connection id");
    }
    expect(configured.status).toBe(201);
    expect(JSON.stringify(configuredBody)).not.toContain("secret-1");
    expect(configureWebhooks).toHaveBeenCalledTimes(1);
    expect(configureWebhooks.mock.calls[0]?.[1].webhooks).toHaveLength(6);
    expect(configuredBody).toMatchObject({
      channel: "whatsapp",
      provider: "zapi",
      readiness: { ready: true, reasonCode: "ready" },
      state: "active",
    });
    const savedConnection = await repository.findConnectionById(configuredId);
    expect(savedConnection).toMatchObject({
      credentialsRef: {
        mode: "stored",
        stored: {
          instanceId: "sealed:zapi.instance-id:instance-1",
          instanceToken: "sealed:zapi.instance-token:instance-secret-1",
        },
      },
    });
    if (savedConnection?.credentialsRef.mode !== "stored") {
      throw new TypeError("Expected stored connection credentials");
    }
    expect(
      jsonObject(savedConnection.credentialsRef.stored).webhookSecret,
    ).toMatch(/^sealed:zapi\.webhook-secret:/u);
    expect(savedConnection).toMatchObject({
      phone: "5511999999999",
      status: "active",
    });

    const refreshed = await app.request("/api/v1/crm/channel-connections");
    expect(refreshed.status).toBe(200);
    const refreshedBody = jsonObject(await refreshed.json());
    if (!Array.isArray(refreshedBody.connections)) {
      throw new TypeError("Expected refreshed connections array");
    }
    expect(jsonObject(refreshedBody.connections[0])).toMatchObject({
      channel: "whatsapp",
      provider: "zapi",
      readiness: { ready: true, reasonCode: "ready" },
      state: "active",
    });

    const duplicate = await app.request("/api/v1/crm/channel-connections", {
      body: JSON.stringify(credentials),
      headers: { "content-type": "application/json" },
      method: "POST",
    });
    expect(duplicate.status).toBe(409);

    const pairing = await app.request(
      `/api/v1/crm/channel-connections/${configuredId}/zapi/pairing/qr`,
      { method: "POST" },
    );
    expect(pairing.status).toBe(409);
    const pairingBody: unknown = await pairing.json();
    expect(pairingBody).toMatchObject({
      code: "CRM_CONNECTION_SETUP_PAIRING_DISCONNECT_REQUIRED",
      details: { nextAction: "disconnect_connection" },
    });
    expect(getQrCode).not.toHaveBeenCalled();
  });

  it("first-configures only the uncredentialed Z-API connection in the authenticated scope", async () => {
    const own = {
      ...createConnection("zapi", {}),
      storeId: customerStoreId,
      tenantId: customerTenantId,
    };
    const foreign = {
      ...createConnection("zapi", {}),
      id: "24000000-0000-4000-8000-000000000202",
      storeId: "store_2" as StoreId,
      tenantId: "tenant_2" as TenantId,
    };
    const repository = createMemoryCrmConnectionRepository([own, foreign]);
    const app = createTestApp({
      crmConnectionRepository: repository,
      billingQuotaGuard: {
        assertAvailable: vi.fn(async () => undefined),
        getAllowance: vi.fn(async () => ({ limit: 1, remaining: 1, used: 0 })),
      },
    });
    const response = await app.request("/api/v1/crm/channel-connections", {
      body: JSON.stringify({
        channel: "whatsapp",
        instanceId: "instance-own",
        instanceToken: "instance-secret",
        provider: "zapi",
      }),
      headers: { "content-type": "application/json" },
      method: "POST",
    });
    expect(response.status).toBe(201);
    await expect(repository.findConnectionById(own.id)).resolves.toMatchObject({
      credentialsRef: { mode: "stored" },
    });
    await expect(repository.findConnectionById(foreign.id)).resolves.toEqual(
      foreign,
    );
  });
});

function jsonObject(value: unknown): Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new TypeError("Expected JSON object response");
  }
  return value as Record<string, unknown>;
}

function arrayContaining(values: readonly unknown[]): unknown {
  return expect.arrayContaining(values as never) as unknown;
}
