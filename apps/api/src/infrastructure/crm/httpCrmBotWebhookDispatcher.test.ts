import type { StoreId, TenantId } from "@lojaveiculosv2/shared";
import { describe, expect, it, vi } from "vitest";
import type { DispatchCrmBotWebhookInput } from "../../domains/crm/ports/crmBotWebhookDispatcher.js";
import {
  createHttpCrmBotWebhookDispatcher,
  CrmBotWebhookDestinationError,
} from "./httpCrmBotWebhookDispatcher.js";

describe("HTTP CRM bot webhook dispatcher", () => {
  it.each([
    "http://bot.example.com/webhook",
    "https://user:password@bot.example.com/webhook",
    "https://localhost/webhook",
    "https://127.0.0.1/webhook",
    "https://10.10.0.2/webhook",
    "https://100.64.0.1/webhook",
    "https://169.254.169.254/latest/meta-data",
    "https://172.16.0.1/webhook",
    "https://192.168.0.1/webhook",
    "https://192.0.2.1/webhook",
    "https://198.18.0.1/webhook",
    "https://224.0.0.1/webhook",
    "https://[::1]/webhook",
    "https://[fc00::1]/webhook",
    "https://[2001:db8::1]/webhook",
    "https://[2001::1]/webhook",
    "https://[3fff::1]/webhook",
    "https://[::ffff:127.0.0.1]/webhook",
  ])("rejects a non-public destination before sending: %s", async (url) => {
    const request = vi.fn();
    const resolve = vi.fn(async () => [{ address: "8.8.8.8", family: 4 }]);
    const dispatcher = createHttpCrmBotWebhookDispatcher(
      {},
      { request, resolve },
    );

    await expect(
      dispatcher.dispatch(dispatchInput(url)),
    ).rejects.toBeInstanceOf(CrmBotWebhookDestinationError);
    expect(request).not.toHaveBeenCalled();
  });

  it("rejects a hostname when any resolved address is private", async () => {
    const request = vi.fn();
    const resolve = vi.fn(async () => [
      { address: "8.8.8.8", family: 4 },
      { address: "10.0.0.5", family: 4 },
    ]);
    const dispatcher = createHttpCrmBotWebhookDispatcher(
      {},
      { request, resolve },
    );

    await expect(
      dispatcher.dispatch(dispatchInput("https://bot.example.com/webhook")),
    ).rejects.toThrow("Bot webhook destination is not allowed.");
    expect(resolve).toHaveBeenCalledWith("bot.example.com");
    expect(request).not.toHaveBeenCalled();
  });

  it("pins each request to its validated address and revalidates retries", async () => {
    const resolve = vi
      .fn()
      .mockResolvedValueOnce([{ address: "8.8.8.8", family: 4 }])
      .mockResolvedValueOnce([{ address: "1.1.1.1", family: 4 }]);
    const request = vi
      .fn()
      .mockResolvedValueOnce(503)
      .mockResolvedValueOnce(204);
    const dispatcher = createHttpCrmBotWebhookDispatcher(
      {},
      { request, resolve },
    );

    await dispatcher.dispatch(dispatchInput("https://bot.example.com/webhook"));

    expect(resolve).toHaveBeenCalledTimes(2);
    expect(request).toHaveBeenCalledTimes(2);
    expect(request.mock.calls[0]?.[0]).toMatchObject({
      address: { address: "8.8.8.8", family: 4 },
      url: new URL("https://bot.example.com/webhook"),
    });
    expect(request.mock.calls[1]?.[0]).toMatchObject({
      address: { address: "1.1.1.1", family: 4 },
      url: new URL("https://bot.example.com/webhook"),
    });
  });

  it("treats redirects as failures without dispatching their location", async () => {
    const resolve = vi.fn(async () => [{ address: "8.8.8.8", family: 4 }]);
    const request = vi.fn().mockResolvedValue(302);
    const dispatcher = createHttpCrmBotWebhookDispatcher(
      {},
      { request, resolve },
    );

    await expect(
      dispatcher.dispatch(dispatchInput("https://bot.example.com/webhook")),
    ).rejects.toThrow("Bot webhook failed with 302.");
    expect(request).toHaveBeenCalledTimes(1);
    expect(resolve).toHaveBeenCalledTimes(1);
  });
});

function dispatchInput(webhookUrl: string): DispatchCrmBotWebhookInput {
  return {
    idempotencyKey: "bot-dispatch-1",
    payload: {
      actionsApi: {
        authentication: "X-Webhook-Secret",
        baseUrl: "https://api.example.com/bot/actions",
      },
      channel: "whatsapp",
      connection: {
        channel: "whatsapp",
        id: "connection-1",
        phone: null,
        provider: "zapi",
        status: "active",
        uuid: "connection-1",
      },
      connectionId: "connection-1",
      connectionPhone: null,
      connectionUuid: "connection-1",
      event: "connection_status_changed",
      instanceName: "Store bot",
      timestamp: "2026-08-11T12:00:00.000Z",
    },
    storeId: "store-1" as StoreId,
    tenantId: "tenant-1" as TenantId,
    webhookSecret: "bot-webhook-secret-value-32-characters",
    webhookUrl,
  };
}
