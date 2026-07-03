import type { StoreId, TenantId } from "@lojaveiculosv2/shared";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { CrmConnection } from "../../../domains/crm/ports/crmConnectionRepository.js";
import { createMemoryCrmConnectionRepository } from "../adapters/memory/crmConnectionRepository.js";
import { createMemoryCrmWhatsappRepository } from "../adapters/memory/crmWhatsappRepository.js";
import {
  createAuditSpy,
  createTestApp,
} from "./crm.whatsapp.controller.testSupport.js";

const storeId = "store_1" as StoreId;
const tenantId = "tenant_1" as TenantId;
const connectionId = "24000000-0000-4000-8000-000000000101";
const originalWebhookEnv = {
  APP_ENV: process.env.APP_ENV,
  CRM_ZAPI_WEBHOOK_TOKEN: process.env.CRM_ZAPI_WEBHOOK_TOKEN,
  LOCAL_AUTH_BYPASS: process.env.LOCAL_AUTH_BYPASS,
};

describe("CRM WhatsApp ZAPI webhooks", () => {
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

  it("updates message status without downgrading later webhooks", async () => {
    const { app, whatsappRepository } = await createWebhookTestApp();

    const delivered = await postWebhook(app, "status", {
      ids: ["zapi-out-1"],
      status: "RECEIVED",
    });
    expect(delivered.status).toBe(200);
    await expect(delivered.json()).resolves.toMatchObject({
      processed: 1,
      status: "accepted",
    });

    const read = await postWebhook(app, "status", {
      ids: ["zapi-out-1"],
      status: "READ",
    });
    expect(read.status).toBe(200);

    const downgrade = await postWebhook(app, "status", {
      ids: ["zapi-out-1"],
      status: "SENT",
    });
    await expect(downgrade.json()).resolves.toMatchObject({
      processed: 0,
    });

    const messages = await whatsappRepository.listMessages({
      limit: 10,
      offset: 0,
      sessionId: (await readSessionId(whatsappRepository)) ?? "",
      storeId,
      tenantId,
    });
    expect(messages[0]).toMatchObject({ status: "READ" });
  });

  it("marks delivery errors as failed and records webhook audit", async () => {
    const { app, auditRecord, whatsappRepository } =
      await createWebhookTestApp();

    const response = await postWebhook(app, "delivery", {
      error: "video too large",
      messageId: "zapi-out-1",
    });

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      processed: 1,
      status: "accepted",
    });
    const message = await whatsappRepository.findMessageByExternalId({
      connectionId,
      externalId: "zapi-out-1",
      storeId,
      tenantId,
    });
    expect(message).toMatchObject({
      status: "FAILED",
    });
    expect(message?.metadata).toMatchObject({
      deliveryError: "video too large",
    });
    expect(auditRecord.mock.calls.map((call) => call[0].action)).toContain(
      "crm.whatsapp.webhook.zapi.delivery",
    );
  });

  it("updates connection state from connected and disconnected callbacks", async () => {
    const connectionRepository = createMemoryCrmConnectionRepository([
      createZapiConnection({ phone: "crm-placeholder" }),
    ]);
    const { app } = await createWebhookTestApp({ connectionRepository });

    const connected = await postWebhook(app, "connected", {
      connected: true,
      connectedPhone: "5511940231407",
    });
    expect(connected.status).toBe(200);
    await expect(
      connectionRepository.findConnectionById(connectionId),
    ).resolves.toMatchObject({ phone: "5511940231407", status: "active" });

    const disconnected = await postWebhook(app, "disconnected", {});
    expect(disconnected.status).toBe(200);
    await expect(
      connectionRepository.findConnectionById(connectionId),
    ).resolves.toMatchObject({ status: "disconnected" });
  });

  it("acknowledges chat presence callbacks", async () => {
    const { app } = await createWebhookTestApp();

    const response = await postWebhook(app, "chat-presence", {
      phone: "5511999999999",
      status: "composing",
    });

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ status: "accepted" });
  });
});

async function createWebhookTestApp(
  input: {
    connectionRepository?: ReturnType<
      typeof createMemoryCrmConnectionRepository
    >;
  } = {},
) {
  const { audit, record } = createAuditSpy();
  const whatsappRepository = createMemoryCrmWhatsappRepository();
  await whatsappRepository.ingestMessage({
    buyerName: "Ana",
    buyerPhone: "5511999999999",
    channel: "WHATSAPP",
    connectionId,
    content: "Mensagem enviada",
    direction: "OUTBOUND",
    externalId: "zapi-out-1",
    metadata: {},
    providerTimestamp: new Date("2026-07-02T19:01:00.000Z"),
    senderType: "HUMAN",
    status: "SENT",
    storeId,
    tenantId,
    type: "TEXT",
  });
  const app = createTestApp({
    audit,
    crmConnectionRepository:
      input.connectionRepository ??
      createMemoryCrmConnectionRepository([createZapiConnection()]),
    crmWhatsappRepository: whatsappRepository,
  });
  return { app, auditRecord: record, whatsappRepository };
}

async function readSessionId(
  whatsappRepository: ReturnType<typeof createMemoryCrmWhatsappRepository>,
) {
  const sessions = await whatsappRepository.listSessions({
    limit: 1,
    offset: 0,
    storeId,
    tenantId,
  });
  return sessions[0]?.id ?? null;
}

function postWebhook(
  app: ReturnType<typeof createTestApp>,
  event: string,
  payload: Record<string, unknown>,
) {
  return app.request(
    `/api/v1/crm/whatsapp/webhooks/zapi/${connectionId}/${event}`,
    {
      body: JSON.stringify(payload),
      headers: { "Content-Type": "application/json" },
      method: "POST",
    },
  );
}

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

function restoreEnv(name: string, value: string | undefined) {
  if (value === undefined) delete process.env[name];
  else process.env[name] = value;
}
