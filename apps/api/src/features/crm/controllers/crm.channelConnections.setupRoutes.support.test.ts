import { describe, expect, it, vi } from "vitest";
import { createMemoryCrmConnectionRepository } from "../adapters/memory/crmConnectionRepository.js";
import {
  connectionId,
  createConnection,
  storeId,
  tenantId,
} from "./crm.channelConnections.setupRoutes.testSupport.js";
import { createTestApp } from "./crm.controller.testSupport.js";

describe("CRM support connection setup routes", () => {
  it("lets platform support create an entitled Z-API connection without persisting plaintext", async () => {
    const repository = createMemoryCrmConnectionRepository();
    const app = createTestApp({
      entitlements: ["crm"],
      crmConnectionCredentialVault: {
        open: vi.fn(async ({ sealed }: { sealed: string }) => sealed),
        seal: vi.fn(
          async ({
            plaintext,
            purpose,
          }: {
            plaintext: string;
            purpose: string;
          }) => `sealed:${purpose}:${plaintext}`,
        ),
      },
      crmConnectionRepository: repository,
      crmZapiSupportAuthorizer: {
        assertCrmSetupEligible: vi.fn(async () => undefined),
      },
      supportPermissions: ["crm.messaging.support.manage"],
    });
    const response = await app.request(
      "/api/v1/crm/whatsapp/support/zapi/connections",
      {
        body: JSON.stringify({
          clientToken: "client-token-1",
          instanceId: "instance-1",
          instanceToken: "secret-1",
          storeId,
          tenantId,
        }),
        headers: { "content-type": "application/json" },
        method: "POST",
      },
    );

    expect(response.status).toBe(201);
    expect(JSON.stringify(await response.json())).not.toContain("secret-1");
    await expect(
      repository.listConnections({ storeId, tenantId }),
    ).resolves.toMatchObject([
      {
        credentialsRef: {
          mode: "stored",
          stored: {
            clientToken: "sealed:zapi.client-token:client-token-1",
            instanceId: "sealed:zapi.instance-id:instance-1",
            instanceToken: "sealed:zapi.instance-token:secret-1",
          },
        },
        externalInstanceId: null,
        provider: "zapi",
      },
    ]);
    expect(
      JSON.stringify(await repository.listConnections({ storeId, tenantId })),
    ).toContain('"webhookSecret":"sealed:zapi.webhook-secret:');
  });

  it("rejects a store or agency account on the support setup route", async () => {
    const authorize = vi.fn(async () => undefined);
    const app = createTestApp({
      crmZapiSupportAuthorizer: { assertCrmSetupEligible: authorize },
      supportPermissions: ["billing.manage"],
    });

    const response = await app.request(
      "/api/v1/crm/whatsapp/support/zapi/connections",
      {
        body: JSON.stringify({
          clientToken: "client-token-1",
          instanceId: "instance-1",
          instanceToken: "secret-1",
          storeId,
          tenantId,
        }),
        headers: { "content-type": "application/json" },
        method: "POST",
      },
    );

    expect(response.status).toBe(403);
    expect(authorize).not.toHaveBeenCalled();
  });

  it("allows only platform support to request a Z-API QR code", async () => {
    const getQrCode = vi.fn(async () => ({
      dataUri: "data:image/png;base64,qr",
      expiresInSeconds: 30,
    }));
    const app = createTestApp({
      entitlements: ["crm"],
      crmConnectionCredentialVault: {
        open: vi.fn(async ({ sealed }: { sealed: string }) =>
          sealed.replace(/^sealed:/, ""),
        ),
        seal: vi.fn(),
      },
      crmConnectionRepository: createMemoryCrmConnectionRepository([
        createConnection("zapi", {
          mode: "stored",
          stored: {
            clientToken: "sealed:client-token-1",
            instanceId: "sealed:instance-1",
            instanceToken: "sealed:token-1",
          },
        }),
      ]),
      crmZapiSupportAuthorizer: {
        assertCrmSetupEligible: vi.fn(async () => undefined),
      },
      supportPermissions: ["crm.messaging.support.manage"],
      zapiConnectionSetupProvider: {
        getPairingCode: vi.fn(),
        getQrCode,
        validateStatus: vi.fn(async () => ({
          connected: false,
          connectedPhone: null,
          smartphoneConnected: false,
        })),
      },
    });

    const response = await app.request(
      `/api/v1/crm/whatsapp/support/zapi/connections/${connectionId}/pairing/qr`,
      {
        body: JSON.stringify({ storeId, tenantId }),
        headers: { "content-type": "application/json" },
        method: "POST",
      },
    );

    expect(response.status).toBe(200);
    expect(getQrCode).toHaveBeenCalledWith({
      clientToken: "client-token-1",
      instanceId: "instance-1",
      instanceToken: "token-1",
    });
  });
});
