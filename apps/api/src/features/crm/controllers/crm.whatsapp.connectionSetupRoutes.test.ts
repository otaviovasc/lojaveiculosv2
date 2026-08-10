import type { StoreId, TenantId } from "@lojaveiculosv2/shared";
import { describe, expect, it, vi } from "vitest";
import type { CrmConnection } from "../../../domains/crm/ports/crmConnectionRepository.js";
import { createMemoryCrmConnectionRepository } from "../adapters/memory/crmConnectionRepository.js";
import { createTestApp } from "./crm.whatsapp.controller.testSupport.js";
import {
  createZapiWebhookSetupIntent,
  withZapiWebhookSetupState,
} from "../../../domains/crm/whatsapp/zapiWebhookSetupState.js";

const storeId = "25000000-0000-4000-8000-000000000001" as StoreId;
const tenantId = "25000000-0000-4000-8000-000000000002" as TenantId;
const connectionId = "24000000-0000-4000-8000-000000000101";

describe("CRM WhatsApp connection setup routes", () => {
  it("rejects Z-API credentials on the customer connection contract", async () => {
    const app = createTestApp();
    const response = await app.request("/api/v1/crm/whatsapp/connections", {
      body: JSON.stringify({
        instanceCredentials: {
          instanceId: "instance-1",
          instanceToken: "secret-1",
        },
        provider: "zapi",
      }),
      headers: { "content-type": "application/json" },
      method: "POST",
    });

    expect(response.status).toBe(400);
  });

  it("lets platform support create a paid Z-API connection without persisting plaintext", async () => {
    const repository = createMemoryCrmConnectionRepository();
    const app = createTestApp({
      entitlements: ["crm", "crm_zapi"],
      billingQuotaGuard: {
        assertAvailable: vi.fn(async () => undefined),
        getAllowance: vi.fn(async () => ({ limit: 1, remaining: 1, used: 0 })),
      },
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
        assertPaidSetupEligible: vi.fn(async () => undefined),
      },
      supportPermissions: ["tenant.manage"],
    });
    const response = await app.request(
      "/api/v1/crm/whatsapp/support/zapi/connections",
      {
        body: JSON.stringify({
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
      crmZapiSupportAuthorizer: { assertPaidSetupEligible: authorize },
      supportPermissions: ["billing.manage"],
    });

    const response = await app.request(
      "/api/v1/crm/whatsapp/support/zapi/connections",
      {
        body: JSON.stringify({
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
      entitlements: ["crm", "crm_zapi"],
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
            instanceId: "sealed:instance-1",
            instanceToken: "sealed:token-1",
          },
        }),
      ]),
      crmZapiSupportAuthorizer: {
        assertPaidSetupEligible: vi.fn(async () => undefined),
      },
      supportPermissions: ["tenant.manage"],
      zapiConnectionSetupProvider: {
        getPairingCode: vi.fn(),
        getQrCode,
        validateStatus: vi.fn(),
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
      instanceId: "instance-1",
      instanceToken: "token-1",
    });
  });

  it("stores only the official connected-account reference", async () => {
    const repository = createMemoryCrmConnectionRepository([
      {
        ...createConnection("composio_whatsapp"),
        storeId: "store_1" as StoreId,
        tenantId: "tenant_1" as TenantId,
      },
    ]);
    const app = createTestApp({
      composioWhatsappOnboardingProvider: {
        createConnectLink: vi.fn(async () => ({
          connectedAccountId: "ca_test",
          expiresAt: "2026-08-09T14:00:00.000Z",
          redirectUrl: "https://connect.composio.dev/session/test",
        })),
        discoverWhatsappResources: vi.fn(),
        subscribeWhatsappApp: vi.fn(),
        verifyConnectedAccount: vi.fn(),
      },
      crmConnectionRepository: repository,
    });

    const response = await app.request(
      `/api/v1/crm/whatsapp/connections/${connectionId}/composio/authorize`,
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

function createConnection(
  provider: "zapi" | "composio_whatsapp",
  credentialsRef: Record<string, unknown> = {},
): CrmConnection {
  return {
    credentialsRef,
    displayName: "Connection",
    externalConnectionId: null,
    externalInstanceId: null,
    id: connectionId,
    metadata:
      provider === "zapi"
        ? withZapiWebhookSetupState(
            {},
            {
              ...createZapiWebhookSetupIntent(connectionId),
              configuredAt: "2026-08-09T12:00:00.000Z",
              status: "configured",
            },
          )
        : {},
    phone: null,
    provider,
    status: "sandbox",
    storeId,
    tenantId,
    webhookUrl: null,
  };
}
