import type { StoreId, TenantId } from "@lojaveiculosv2/shared";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { CrmConnection } from "../../../domains/crm/ports/crmConnectionRepository.js";
import { createMemoryCrmConnectionRepository } from "../adapters/memory/crmConnectionRepository.js";
import { createMemoryCrmCanonicalInboundRepository } from "../adapters/memory/crmCanonicalInboundRepository.js";
import { createMemoryCrmRepository } from "../adapters/memory/crmRepository.js";
import { createMemoryCrmConversationRepository } from "../adapters/memory/crmConversationRepository.js";
import { createConfiguredZapiTestConnection } from "./crm.channelConnections.testSupport.js";
import { createTestApp } from "./crm.controller.testSupport.js";

const storeId = "store_1" as StoreId;
const tenantId = "tenant_1" as TenantId;
const connectionId = "24000000-0000-4000-8000-000000000101";
const originalWebhookEnv = {
  APP_ENV: process.env.APP_ENV,
  CRM_ZAPI_WEBHOOK_TOKEN: process.env.CRM_ZAPI_WEBHOOK_TOKEN,
  LOCAL_AUTH_BYPASS: process.env.LOCAL_AUTH_BYPASS,
};

describe("CRM cycles", () => {
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

  it("ingests a ZAPI webhook into CRM cycles and messages", async () => {
    const crmRepository = createMemoryCrmRepository();
    const conversationRepository = createMemoryCrmConversationRepository();
    const canonicalRepository = createMemoryCrmCanonicalInboundRepository(
      conversationRepository,
    );
    const app = createTestApp({
      crmCanonicalInboundRepository: canonicalRepository,
      crmConnectionCredentialVault: testVault(),
      crmConnectionRepository: createMemoryCrmConnectionRepository([
        createZapiConnection(),
      ]),
      crmRepository,
      crmConversationRepository: conversationRepository,
    });

    const firstResponse = await postZapiWebhook(app);
    expect(firstResponse.status).toBe(201);
    const firstBody = (await firstResponse.json()) as {
      conversationCycle: { leadId?: unknown };
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
      conversationCycle: {
        lastMessageContent: "Ola, tenho interesse",
        status: "ACTIVE",
        unreadCount: 1,
      },
      status: "stored",
    });
    expect(typeof firstBody.conversationCycle.leadId).toBe("string");
    const leads = await crmRepository.listLeads({
      limit: 10,
      source: "whatsapp",
      storeId,
      tenantId,
    });
    expect(leads).toMatchObject([
      {
        buyerName: "Ana",
        buyerPhone: "5511999999999",
        source: "whatsapp",
      },
    ]);
    await expect(
      conversationRepository.listConversationCycles({
        limit: 10,
        offset: 0,
        storeId,
        tenantId,
      }),
    ).resolves.toHaveLength(1);

    const duplicateResponse = await postZapiWebhook(app);
    expect(duplicateResponse.status).toBe(200);
    await expect(duplicateResponse.json()).resolves.toMatchObject({
      status: "duplicate",
    });
    await expect(
      conversationRepository.listMessages({
        limit: 10,
        offset: 0,
        cycleId: (firstBody as { conversationCycle: { id: string } })
          .conversationCycle.id,
        storeId,
        tenantId,
      }),
    ).resolves.toHaveLength(1);
  });

  it("uses chatPhone instead of LID for cycle identity", async () => {
    const app = createTestApp({
      crmConnectionRepository: createMemoryCrmConnectionRepository([
        createZapiConnection(),
      ]),
      crmConversationRepository: createMemoryCrmConversationRepository(),
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
      conversationCycle: { metadata?: unknown };
    };
    expect(body).toMatchObject({
      conversationCycle: {
        customerPhone: "5511888887777",
      },
      status: "stored",
    });
    expect(typeof body.conversationCycle.metadata).toBe("object");
    expect(body.conversationCycle.metadata).not.toBeNull();
  });

  it("ignores non-message ZAPI webhook events", async () => {
    const app = createTestApp({
      crmConnectionRepository: createMemoryCrmConnectionRepository([
        createZapiConnection(),
      ]),
      crmConversationRepository: createMemoryCrmConversationRepository(),
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
  return createConfiguredZapiTestConnection({
    id: connectionId,
    overrides,
    storeId,
    tenantId,
  });
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
      headers: {
        "Content-Type": "application/json",
        "x-crm-webhook-token": "webhook-secret",
      },
      method: "POST",
    },
  );
}

function testVault() {
  return {
    open: async ({ sealed }: { sealed: string }) =>
      sealed.replace(/^sealed:/u, ""),
    seal: async ({ plaintext }: { plaintext: string }) => `sealed:${plaintext}`,
  };
}

function restoreEnv(name: string, value: string | undefined) {
  if (value === undefined) delete process.env[name];
  else process.env[name] = value;
}
