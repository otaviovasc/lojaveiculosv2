import type { StoreId, TenantId } from "@lojaveiculosv2/shared";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { CrmConnection } from "../../../domains/crm/ports/crmConnectionRepository.js";
import { createMemoryCrmConnectionRepository } from "../adapters/memory/crmConnectionRepository.js";
import { createMemoryCrmRepository } from "../adapters/memory/crmRepository.js";
import { createMemoryCrmWhatsappRepository } from "../adapters/memory/crmWhatsappRepository.js";
import { createTestApp } from "./crm.whatsapp.controller.testSupport.js";

const storeId = "store_1" as StoreId;
const tenantId = "tenant_1" as TenantId;
const connectionId = "24000000-0000-4000-8000-000000000101";
const originalWebhookEnv = {
  APP_ENV: process.env.APP_ENV,
  CRM_ZAPI_WEBHOOK_TOKEN: process.env.CRM_ZAPI_WEBHOOK_TOKEN,
  LOCAL_AUTH_BYPASS: process.env.LOCAL_AUTH_BYPASS,
};

describe("CRM WhatsApp sessions", () => {
  beforeEach(() => {
    process.env.APP_ENV = "local";
    process.env.LOCAL_AUTH_BYPASS = "true";
    delete process.env.CRM_ZAPI_WEBHOOK_TOKEN;
  });

  afterEach(() => {
    restoreEnv("APP_ENV", originalWebhookEnv.APP_ENV);
    restoreEnv("LOCAL_AUTH_BYPASS", originalWebhookEnv.LOCAL_AUTH_BYPASS);
    restoreEnv(
      "CRM_ZAPI_WEBHOOK_TOKEN",
      originalWebhookEnv.CRM_ZAPI_WEBHOOK_TOKEN,
    );
  });

  it("ingests a ZAPI webhook into CRM sessions and messages", async () => {
    const crmRepository = createMemoryCrmRepository();
    const app = createTestApp({
      crmConnectionRepository: createMemoryCrmConnectionRepository([
        createZapiConnection(),
      ]),
      crmRepository,
      crmWhatsappRepository: createMemoryCrmWhatsappRepository(),
    });

    const firstResponse = await postZapiWebhook(app);
    expect(firstResponse.status).toBe(201);
    const firstBody = (await firstResponse.json()) as {
      session: { leadId?: unknown };
    };
    expect(firstBody).toMatchObject({
      message: {
        content: "Ola, tenho interesse",
        direction: "INBOUND",
        externalId: "zapi-message-1",
        senderType: "CUSTOMER",
        status: "DELIVERED",
        type: "TEXT",
      },
      session: {
        buyerName: "Ana",
        buyerPhone: "5511999999999",
        connection: { id: connectionId, provider: "zapi" },
        lastMessageContent: "Ola, tenho interesse",
        status: "ACTIVE",
        unreadCount: 1,
      },
      status: "stored",
    });
    expect(typeof firstBody.session.leadId).toBe("string");
    const leads = await crmRepository.listLeads({
      limit: 10,
      source: "whatsapp",
      storeId,
      tenantId,
    });
    expect(leads).toHaveLength(1);
    expect(leads[0]).toMatchObject({
      buyerName: "Ana",
      buyerPhone: "5511999999999",
      source: "whatsapp",
      status: "new",
    });
    const activities = await crmRepository.listActivities({
      leadId: leads[0]?.id ?? "",
      limit: 10,
      storeId,
      tenantId,
    });
    expect(activities).toHaveLength(1);
    expect(activities[0]).toMatchObject({
      activityType: "whatsapp",
      content: "Ola, tenho interesse",
      direction: "inbound",
    });

    const duplicateResponse = await postZapiWebhook(app);
    expect(duplicateResponse.status).toBe(200);
    await expect(duplicateResponse.json()).resolves.toMatchObject({
      status: "duplicate",
    });
    await expect(
      crmRepository.listActivities({
        leadId: leads[0]?.id ?? "",
        limit: 10,
        storeId,
        tenantId,
      }),
    ).resolves.toHaveLength(1);

    const sessionsResponse = await app.request(
      `/api/v1/crm/whatsapp/sessions?connectionId=${connectionId}`,
    );
    expect(sessionsResponse.status).toBe(200);
    const sessions = (await sessionsResponse.json()) as Array<{ id: string }>;
    expect(sessions).toHaveLength(1);
    expect(sessions[0]).toMatchObject({
      buyerPhone: "5511999999999",
      unreadCount: 1,
    });

    const messagesResponse = await app.request(
      `/api/v1/crm/whatsapp/messages/${sessions[0]?.id}`,
    );
    expect(messagesResponse.status).toBe(200);
    await expect(messagesResponse.json()).resolves.toMatchObject([
      {
        content: "Ola, tenho interesse",
        externalId: "zapi-message-1",
      },
    ]);
  });

  it("uses chatPhone instead of LID for session identity", async () => {
    const app = createTestApp({
      crmConnectionRepository: createMemoryCrmConnectionRepository([
        createZapiConnection(),
      ]),
      crmWhatsappRepository: createMemoryCrmWhatsappRepository(),
    });

    const response = await postZapiWebhook(app, {
      chatLid: "999999999999999999@lid",
      chatPhone: "5511888887777@s.whatsapp.net",
      messageId: "zapi-lid-1",
      phone: "999999999999999999@lid",
      senderName: "Lead LID",
      text: { message: "Vem do LID" },
    });

    expect(response.status).toBe(201);
    const body = (await response.json()) as {
      session: { metadata?: unknown };
    };
    expect(body).toMatchObject({
      session: {
        buyerPhone: "5511888887777",
      },
      status: "stored",
    });
    expect(typeof body.session.metadata).toBe("object");
    expect(body.session.metadata).not.toBeNull();
  });

  it("ignores non-message ZAPI webhook events", async () => {
    const app = createTestApp({
      crmConnectionRepository: createMemoryCrmConnectionRepository([
        createZapiConnection(),
      ]),
      crmWhatsappRepository: createMemoryCrmWhatsappRepository(),
    });

    const response = await postZapiWebhook(app, {
      isGroup: true,
      messageId: "zapi-group-1",
      phone: "5511999999999",
      text: { message: "grupo" },
    });

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      reason: "not_processable",
      status: "ignored",
    });
  });
});

function createZapiConnection(
  overrides: Partial<CrmConnection> = {},
): CrmConnection {
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
    ...overrides,
  };
}

function postZapiWebhook(
  app: ReturnType<typeof createTestApp>,
  overrides: Record<string, unknown> = {},
) {
  return app.request(
    `/api/v1/crm/whatsapp/webhooks/zapi/${connectionId}/received`,
    {
      body: JSON.stringify({
        messageId: "zapi-message-1",
        phone: "5511999999999",
        senderName: "Ana",
        text: { message: "Ola, tenho interesse" },
        timestamp: 1783029600,
        ...overrides,
      }),
      headers: { "Content-Type": "application/json" },
      method: "POST",
    },
  );
}

function restoreEnv(name: string, value: string | undefined) {
  if (value === undefined) delete process.env[name];
  else process.env[name] = value;
}
