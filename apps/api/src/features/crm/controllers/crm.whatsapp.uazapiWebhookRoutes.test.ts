import type { StoreId, TenantId } from "@lojaveiculosv2/shared";
import { describe, expect, it } from "vitest";
import type { CrmConnection } from "../../../domains/crm/ports/crmConnectionRepository.js";
import { createMemoryCrmConnectionRepository } from "../adapters/memory/crmConnectionRepository.js";
import { createTestApp } from "./crm.controller.testSupport.js";

const storeId = "store_1" as StoreId;
const tenantId = "tenant_1" as TenantId;
const connectionId = "24000000-0000-4000-8000-000000000202";
const webhookSecret = "uazapi-webhook-secret";

function createUazapiConnection(
  overrides: Partial<CrmConnection> = {},
): CrmConnection {
  return {
    broker: "direct",
    channel: "whatsapp",
    credentialsRef: { stored: { webhookSecret: `sealed:${webhookSecret}` } },
    displayName: "UAZAPI Test Connection",
    externalConnectionId: null,
    externalInstanceId: "instance-uazapi-1",
    id: connectionId,
    metadata: {},
    phone: null,
    provider: "uazapi",
    status: "sandbox",
    storeId,
    tenantId,
    webhookUrl: null,
    ...overrides,
  };
}

function createUazapiWebhookTestApp(
  options: Parameters<typeof createTestApp>[0] = {},
) {
  const connectionRepository = createMemoryCrmConnectionRepository([
    createUazapiConnection(),
  ]);
  const app = createTestApp({
    crmConnectionRepository: connectionRepository,
    ...options,
  });
  return { app, connectionRepository };
}

function postUazapiWebhook(
  app: ReturnType<typeof createTestApp>,
  payload: Record<string, unknown>,
  token: string | null = webhookSecret,
) {
  return app.request(`/api/v1/crm/whatsapp/webhooks/uazapi/${connectionId}`, {
    body: JSON.stringify(payload),
    headers: {
      "Content-Type": "application/json",
      ...(token ? { "x-crm-webhook-token": token } : {}),
    },
    method: "POST",
  });
}

function messagePayload(messageid = "3EB0538DA65A59F6D8A251") {
  return {
    event: "message",
    instance: "instance-uazapi-1",
    data: {
      chatid: "5511999999999@s.whatsapp.net",
      fromMe: false,
      isGroup: false,
      messageTimestamp: 1_783_029_600_000,
      messageType: "conversation",
      messageid,
      sender: "5511999999999@s.whatsapp.net",
      senderName: "Ana",
      text: "Ola",
    },
  };
}

describe("CRM WhatsApp uazapi webhook route", () => {
  it("rejects requests without a valid webhook token", async () => {
    const { app } = createUazapiWebhookTestApp();

    expect((await postUazapiWebhook(app, messagePayload(), null)).status).toBe(
      403,
    );
    expect(
      (await postUazapiWebhook(app, messagePayload(), "wrong-secret")).status,
    ).toBe(403);
  });

  it("rejects a valid token when the store lacks the crm entitlement", async () => {
    const { app } = createUazapiWebhookTestApp({
      resolveBotEntitlements: async () => [],
    });

    const response = await postUazapiWebhook(app, messagePayload());

    expect(response.status).toBe(403);
  });

  it("dispatches message envelopes to ingestion and acks stored messages with 201", async () => {
    const { app } = createUazapiWebhookTestApp();

    const response = await postUazapiWebhook(app, messagePayload());

    expect(response.status).toBe(201);
    await expect(response.json()).resolves.toMatchObject({ status: "stored" });
  });

  it("acks duplicate message envelopes with 200", async () => {
    const { app } = createUazapiWebhookTestApp();

    await postUazapiWebhook(app, messagePayload());
    const duplicate = await postUazapiWebhook(app, messagePayload());

    expect(duplicate.status).toBe(200);
    await expect(duplicate.json()).resolves.toMatchObject({
      status: "duplicate",
    });
  });

  it("dispatches messages_update envelopes to status processing", async () => {
    const { app } = createUazapiWebhookTestApp();

    const response = await postUazapiWebhook(app, {
      EventType: "messages_update",
      event: "message",
      instance: "instance-uazapi-1",
      data: [{ messageid: "3EB0538DA65A59F6D8A251", status: "READ" }],
    });

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      status: "accepted",
    });
  });

  it("dispatches connection envelopes to connection processing", async () => {
    const { app, connectionRepository } = createUazapiWebhookTestApp();

    const response = await postUazapiWebhook(app, {
      event: "connection",
      instance: "instance-uazapi-1",
      data: {
        connected: true,
        jid: { user: "5511999990000" },
        status: "connected",
      },
    });

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      status: "accepted",
    });
    const connection =
      await connectionRepository.findConnectionById(connectionId);
    expect(connection?.status).toBe("active");
    expect(connection?.phone).toBe("5511999990000");
  });
});
