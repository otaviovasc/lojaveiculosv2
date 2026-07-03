import type { StoreId, TenantId } from "@lojaveiculosv2/shared";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { CrmConnection } from "../../../domains/crm/ports/crmConnectionRepository.js";
import { createMemoryCrmConnectionRepository } from "../adapters/memory/crmConnectionRepository.js";
import { createMemoryCrmWhatsappRepository } from "../adapters/memory/crmWhatsappRepository.js";
import { createTestApp } from "./crm.whatsapp.controller.testSupport.js";

const storeId = "store_1" as StoreId;
const tenantId = "tenant_1" as TenantId;
const connectionId = "24000000-0000-4000-8000-000000000101";
const originalEnv = {
  APP_ENV: process.env.APP_ENV,
  CRM_ZAPI_WEBHOOK_TOKEN: process.env.CRM_ZAPI_WEBHOOK_TOKEN,
  LOCAL_AUTH_BYPASS: process.env.LOCAL_AUTH_BYPASS,
  NODE_ENV: process.env.NODE_ENV,
};

describe("CRM WhatsApp webhook authentication", () => {
  beforeEach(() => {
    process.env.LOCAL_AUTH_BYPASS = "true";
    delete process.env.CRM_ZAPI_WEBHOOK_TOKEN;
  });

  afterEach(() => {
    restoreEnv("APP_ENV", originalEnv.APP_ENV);
    restoreEnv("CRM_ZAPI_WEBHOOK_TOKEN", originalEnv.CRM_ZAPI_WEBHOOK_TOKEN);
    restoreEnv("LOCAL_AUTH_BYPASS", originalEnv.LOCAL_AUTH_BYPASS);
    restoreEnv("NODE_ENV", originalEnv.NODE_ENV);
  });

  it("allows unsigned ZAPI webhooks only in local development", async () => {
    process.env.APP_ENV = "local";
    const app = createWebhookAuthApp();

    const response = await postReceived(app);

    expect(response.status).toBe(201);
  });

  it("rejects unsigned ZAPI webhooks outside local development", async () => {
    process.env.APP_ENV = "production";
    const app = createWebhookAuthApp();

    const response = await postReceived(app);

    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toMatchObject({
      code: "AUTHORIZATION_DENIED",
      message: "CRM WhatsApp webhook token is required.",
    });
  });

  it("accepts production ZAPI webhooks with the configured shared token", async () => {
    process.env.APP_ENV = "production";
    process.env.CRM_ZAPI_WEBHOOK_TOKEN = "secret-zapi-token";
    const app = createWebhookAuthApp();

    const response = await postReceived(app, {
      headers: { "x-crm-webhook-token": "secret-zapi-token" },
    });

    expect(response.status).toBe(201);
  });
});

function createWebhookAuthApp() {
  return createTestApp({
    crmConnectionRepository: createMemoryCrmConnectionRepository([
      createZapiConnection(),
    ]),
    crmWhatsappRepository: createMemoryCrmWhatsappRepository(),
  });
}

function postReceived(
  app: ReturnType<typeof createTestApp>,
  input: { headers?: Record<string, string> } = {},
) {
  return app.request(
    `/api/v1/crm/whatsapp/webhooks/zapi/${connectionId}/received`,
    {
      body: JSON.stringify({
        messageId: `zapi-auth-${Date.now()}`,
        phone: "5511999999999",
        senderName: "Ana",
        text: { message: "Ola" },
        timestamp: 1783029600,
      }),
      headers: {
        "Content-Type": "application/json",
        ...input.headers,
      },
      method: "POST",
    },
  );
}

function createZapiConnection(): CrmConnection {
  return {
    credentialsRef: {},
    displayName: "ZAPI Test Connection",
    externalConnectionId: null,
    externalInstanceId: null,
    id: connectionId,
    metadata: {},
    phone: null,
    provider: "zapi",
    status: "sandbox",
    storeId,
    tenantId,
    webhookUrl: null,
  };
}

function restoreEnv(name: string, value: string | undefined) {
  if (value === undefined) delete process.env[name];
  else process.env[name] = value;
}
