import { describe, expect, it, vi } from "vitest";
import type { CrmOlxWebhookSecurity } from "../../../domains/crm/ports/crmOlxWebhookSecurity.js";
import {
  connectionA,
  createWebhookAuthApp,
  postReceived,
} from "./crm.whatsapp.webhookAuth.testSupport.js";

describe("CRM WhatsApp webhook payload security", () => {
  it("accepts the provider-required query credential without reflecting it", async () => {
    const app = createWebhookAuthApp();
    const response = await app.request(
      `/api/v1/crm/whatsapp/webhooks/zapi/${connectionA}/received?token=secret-a`,
      {
        body: JSON.stringify({
          messageId: "query-token",
          phone: "5511999999999",
          senderName: "Ana",
          text: { message: "Ola" },
          timestamp: 1783029600,
        }),
        headers: { "Content-Type": "application/json" },
        method: "POST",
      },
    );

    expect(response.status).toBe(201);
    expect(await response.text()).not.toContain("secret-a");
  });

  it("rejects oversized webhook payloads before ingestion", async () => {
    const app = createWebhookAuthApp();
    const response = await app.request(
      `/api/v1/crm/whatsapp/webhooks/zapi/${connectionA}/received`,
      {
        body: JSON.stringify({ text: "x".repeat(257 * 1024) }),
        headers: {
          "Content-Type": "application/json",
          "x-crm-webhook-token": "secret-a",
        },
        method: "POST",
      },
    );

    expect(response.status).toBe(400);
  });

  it.each([
    ["excessive nesting", deeplyNestedPayload()],
    ["too many array items", { items: Array.from({ length: 501 }) }],
    [
      "too many object keys",
      Object.fromEntries(
        Array.from({ length: 1_001 }, (_, index) => [`key${index}`, index]),
      ),
    ],
    ["an oversized string", { value: "x".repeat(65 * 1024) }],
  ])("rejects webhook payloads with %s", async (_case, body) => {
    const app = createWebhookAuthApp();
    const response = await app.request(
      `/api/v1/crm/whatsapp/webhooks/zapi/${connectionA}/received`,
      {
        body: JSON.stringify(body),
        headers: {
          "Content-Type": "application/json",
          "x-crm-webhook-token": "secret-a",
        },
        method: "POST",
      },
    );

    expect(response.status).toBe(400);
  });

  it("charges authenticated callbacks only to the connection bucket", async () => {
    const consume = vi.fn<CrmOlxWebhookSecurity["consume"]>(async () => false);
    const app = createWebhookAuthApp(["crm"], undefined, {
      consume,
      futureSkewMs: 60_000,
      maxAgeMs: 600_000,
      now: () => new Date("2026-08-25T12:00:00.000Z"),
    });

    const response = await postReceived(app, connectionA, "secret-a");

    expect(response.status).toBe(429);
    expect(consume).toHaveBeenCalledWith(
      expect.objectContaining({
        connectionId: connectionA,
        scope: "connection",
      }),
    );
    expect(consume).not.toHaveBeenCalledWith(
      expect.objectContaining({ scope: "unauthenticated" }),
    );
  });

  it("keeps invalid-token attempts out of the valid connection bucket", async () => {
    const consume = vi.fn<CrmOlxWebhookSecurity["consume"]>(async () => true);
    const app = createWebhookAuthApp(["crm"], undefined, {
      consume,
      futureSkewMs: 60_000,
      maxAgeMs: 600_000,
      now: () => new Date("2026-08-25T12:00:00.000Z"),
    });

    const response = await postReceived(app, connectionA, "invalid-token");

    expect(response.status).toBe(403);
    const [attempt] = consume.mock.calls[0] ?? [];
    expect(attempt?.scope).toBe("unauthenticated");
    if (attempt?.scope !== "unauthenticated") {
      throw new Error("Expected an unauthenticated rate-limit attempt.");
    }
    expect(attempt.sourceFingerprint).toMatch(/^[a-f0-9]{64}$/u);
    expect(consume).not.toHaveBeenCalledWith(
      expect.objectContaining({ scope: "connection" }),
    );
  });
});

function deeplyNestedPayload() {
  let payload: Record<string, unknown> = { value: true };
  for (let depth = 0; depth < 18; depth += 1) payload = { child: payload };
  return payload;
}
