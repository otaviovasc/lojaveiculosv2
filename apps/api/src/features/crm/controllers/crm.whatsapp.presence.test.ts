import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  connectionId,
  createWebhookTestApp,
  postWebhook,
  readCycleId,
  storeId,
  tenantId,
} from "./crm.whatsapp.webhooks.testSupport.js";

const previousLocalAuthBypass = process.env.LOCAL_AUTH_BYPASS;

describe("CRM WhatsApp Z-API presence", () => {
  beforeEach(() => {
    process.env.APP_ENV = "local";
    process.env.LOCAL_AUTH_BYPASS = "true";
    delete process.env.CRM_ZAPI_WEBHOOK_TOKEN;
  });

  afterEach(() => {
    if (previousLocalAuthBypass === undefined) {
      delete process.env.LOCAL_AUTH_BYPASS;
    } else {
      process.env.LOCAL_AUTH_BYPASS = previousLocalAuthBypass;
    }
  });

  it.each([
    [
      { phone: "+55 (11) 99999-9999", status: "COMPOSING" },
      { phone: "5511999999999", state: "composing" },
    ],
    [
      { chatId: "5511999999999@c.us", presence: "paused" },
      { phone: "5511999999999", state: "paused" },
    ],
  ])("publishes sanitized callbacks", async (payload, expected) => {
    const publish = vi.fn(async () => undefined);
    const { app, whatsappRepository } = await createWebhookTestApp({
      crmRealtimePublisher: { publish },
    });
    const cycleId = await readCycleId(whatsappRepository);

    const response = await postWebhook(app, "chat-presence", payload);

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ status: "accepted" });
    expect(publish).toHaveBeenCalledWith({
      assignedUserId: null,
      connectionId,
      cycleId,
      payload: expected,
      storeId,
      tenantId,
      type: "presence",
    });
  });

  it("publishes composing after pause without durable deduplication", async () => {
    const publish = vi.fn(async () => undefined);
    const { app } = await createWebhookTestApp({
      crmRealtimePublisher: { publish },
    });

    for (const status of ["composing", "paused", "composing"]) {
      const response = await postWebhook(app, "chat-presence", {
        phone: "5511999999999",
        status,
      });
      expect(response.status).toBe(200);
      await expect(response.json()).resolves.toEqual({ status: "accepted" });
    }

    expect(publish).toHaveBeenCalledTimes(3);
  });

  it.each([
    { phone: "5511999999999", status: "recording" },
    { phone: "5511999999999", status: "composing", state: "paused" },
    {
      chatId: "5511888888888@c.us",
      phone: "5511999999999",
      status: "composing",
    },
    { status: "composing" },
  ])("ignores ambiguous or unsupported payloads", async (payload) => {
    const publish = vi.fn(async () => undefined);
    const { app } = await createWebhookTestApp({
      crmRealtimePublisher: { publish },
    });

    const response = await postWebhook(app, "chat-presence", payload);

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      reason: "presence_payload_invalid",
      status: "ignored",
    });
    expect(publish).not.toHaveBeenCalled();
  });
});
