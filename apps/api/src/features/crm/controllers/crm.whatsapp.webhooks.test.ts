import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createMemoryCrmConnectionRepository } from "../adapters/memory/crmConnectionRepository.js";
import {
  connectionId,
  createWebhookTestApp,
  createZapiConnection,
  postWebhook,
  readSessionId,
  storeId,
  tenantId,
} from "./crm.whatsapp.webhooks.testSupport.js";
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
    const lateFailure = await postWebhook(app, "delivery", {
      error: "late provider failure",
      messageId: "zapi-out-1",
    });
    await expect(lateFailure.json()).resolves.toMatchObject({
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

  it("carries authenticated scope through delivery and status bindings", async () => {
    let entitlementResolutions = 0;
    const { app } = await createWebhookTestApp({
      resolveBotEntitlements: async ({
        context,
        storeId: resolvedStoreId,
        tenantId: resolvedTenantId,
      }) => {
        expect(context).toMatchObject({
          actor: { id: "zapi", kind: "integration" },
          permissions: ["crm.whatsapp.ingest"],
          storeId: resolvedStoreId,
          tenantId: resolvedTenantId,
        });
        entitlementResolutions++;
        return ["crm", "crm_zapi"];
      },
    });

    const delivery = await postWebhook(app, "delivery", {
      messageId: "zapi-out-1",
    });
    const status = await postWebhook(app, "status", {
      ids: ["zapi-out-1"],
      status: "RECEIVED",
    });

    expect(delivery.status).toBe(200);
    expect(status.status).toBe(200);
    expect(entitlementResolutions).toBe(2);
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

  it("never processes a Z-API callback through an official connection id", async () => {
    const connectionRepository = createMemoryCrmConnectionRepository([
      createZapiConnection({ provider: "composio_whatsapp" }),
    ]);
    const { app } = await createWebhookTestApp({ connectionRepository });

    const response = await postWebhook(app, "chat-presence", {
      phone: "5511999999999",
      status: "composing",
    });

    expect(response.status).toBe(403);
  });

  it("never resurrects an archived Z-API connection", async () => {
    const connectionRepository = createMemoryCrmConnectionRepository([
      createZapiConnection({ status: "archived" }),
    ]);
    const { app } = await createWebhookTestApp({ connectionRepository });

    const response = await postWebhook(app, "connected", { connected: true });

    expect(response.status).toBe(403);
    await expect(
      connectionRepository.findConnectionById(connectionId),
    ).resolves.toMatchObject({ status: "archived" });
  });
});

function restoreEnv(name: string, value: string | undefined) {
  if (value === undefined) delete process.env[name];
  else process.env[name] = value;
}
