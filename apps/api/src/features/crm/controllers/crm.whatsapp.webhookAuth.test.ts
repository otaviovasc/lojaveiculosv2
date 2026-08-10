import type { StoreId, TenantId } from "@lojaveiculosv2/shared";
import { describe, expect, it } from "vitest";
import type { CrmConnection } from "../../../domains/crm/ports/crmConnectionRepository.js";
import { createMemoryCrmConnectionRepository } from "../adapters/memory/crmConnectionRepository.js";
import { createMemoryCrmWhatsappRepository } from "../adapters/memory/crmWhatsappRepository.js";
import { createTestApp } from "./crm.whatsapp.controller.testSupport.js";

const storeId = "store_1" as StoreId;
const tenantId = "tenant_1" as TenantId;
const connectionA = "24000000-0000-4000-8000-000000000101";
const connectionB = "24000000-0000-4000-8000-000000000102";

describe("CRM WhatsApp webhook authentication", () => {
  it("requires the secret sealed for the addressed connection", async () => {
    const app = createWebhookAuthApp();

    expect((await postReceived(app, connectionA)).status).toBe(403);
    expect((await postReceived(app, connectionA, "secret-a")).status).toBe(201);
  });

  it("rejects a valid secret from another store connection", async () => {
    const app = createWebhookAuthApp();

    const forged = await postReceived(app, connectionB, "secret-a");

    expect(forged.status).toBe(403);
    await expect(forged.json()).resolves.toMatchObject({
      code: "AUTHORIZATION_DENIED",
      message: "Invalid CRM WhatsApp webhook token.",
    });
  });
});

function createWebhookAuthApp() {
  return createTestApp({
    crmConnectionCredentialVault: {
      open: async ({ sealed }) => sealed.replace(/^sealed:/u, ""),
      seal: async ({ plaintext }) => `sealed:${plaintext}`,
    },
    crmConnectionRepository: createMemoryCrmConnectionRepository([
      createZapiConnection(connectionA, "secret-a", storeId, tenantId),
      createZapiConnection(
        connectionB,
        "secret-b",
        "store_2" as StoreId,
        "tenant_2" as TenantId,
      ),
    ]),
    crmWhatsappRepository: createMemoryCrmWhatsappRepository(),
  });
}

function postReceived(
  app: ReturnType<typeof createTestApp>,
  connectionId: string,
  token?: string,
) {
  return app.request(
    `/api/v1/crm/whatsapp/webhooks/zapi/${connectionId}/received`,
    {
      body: JSON.stringify({
        messageId: `zapi-auth-${connectionId}`,
        phone: "5511999999999",
        senderName: "Ana",
        text: { message: "Ola" },
        timestamp: 1783029600,
      }),
      headers: {
        "Content-Type": "application/json",
        ...(token ? { "x-crm-webhook-token": token } : {}),
      },
      method: "POST",
    },
  );
}

function createZapiConnection(
  id: string,
  secret: string,
  connectionStoreId: StoreId,
  connectionTenantId: TenantId,
): CrmConnection {
  return {
    credentialsRef: { stored: { webhookSecret: `sealed:${secret}` } },
    displayName: "ZAPI Test Connection",
    externalConnectionId: null,
    externalInstanceId: null,
    id,
    metadata: {},
    phone: null,
    provider: "zapi",
    status: "active",
    storeId: connectionStoreId,
    tenantId: connectionTenantId,
    webhookUrl: null,
  };
}
