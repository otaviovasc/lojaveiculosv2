import { afterEach, describe, expect, it, vi } from "vitest";
import { createMemoryCrmBotIntegrationRepository } from "../adapters/memory/crmBotIntegrationRepository.js";
import { createMemoryCrmConnectionRepository } from "../adapters/memory/crmConnectionRepository.js";
import { createMemoryCrmCanonicalInboundRepository } from "../adapters/memory/crmCanonicalInboundRepository.js";
import { createMemoryCrmWhatsappRepository } from "../adapters/memory/crmWhatsappRepository.js";
import {
  createOlxConnection,
  olxSecurity,
  postOlx,
  storeId,
  tenantId,
  validPayload,
} from "./crm.olxChat.testSupport.js";
import { createTestApp } from "./crm.whatsapp.controller.testSupport.js";

afterEach(() => vi.useRealTimers());

describe("CRM OLX Chat effects", () => {
  it("rate-limits before ingesting or auditing an accepted OLX event", async () => {
    const audit = { record: vi.fn(async () => undefined) };
    const whatsappRepository = createMemoryCrmWhatsappRepository();
    const app = createTestApp({
      audit,
      crmConnectionRepository: createMemoryCrmConnectionRepository([
        createOlxConnection(),
      ]),
      crmOlxWebhookSecurity: olxSecurity({ allowed: false }),
      crmWhatsappRepository: whatsappRepository,
      entitlements: ["crm"],
      olxChatEnabled: true,
    });

    const response = await postOlx(app, validPayload());

    expect(response.status).toBe(429);
    expect(audit.record).not.toHaveBeenCalledWith(
      expect.objectContaining({ action: "crm.messaging.webhook.olx.accepted" }),
    );
  });

  it("recovers only undelivered post-commit effects on provider replay", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-08-10T12:01:00.000Z"));
    const whatsappRepository = createMemoryCrmWhatsappRepository();
    const canonicalRepository = createMemoryCrmCanonicalInboundRepository();
    const botRepository = createMemoryCrmBotIntegrationRepository();
    await botRepository.upsertBotIntegration({
      enabled: true,
      storeId,
      tenantId,
      webhookSecretHash: "configured",
      webhookSecretSealed: "sealed:delivery-secret",
      webhookUrl: "https://bot.example.test/webhook",
    });
    const publish = vi
      .fn<(...args: unknown[]) => Promise<void>>()
      .mockRejectedValueOnce(new Error("realtime unavailable"))
      .mockResolvedValue(undefined);
    const dispatch = vi.fn(async () => undefined);
    const app = createTestApp({
      crmBotIntegrationRepository: botRepository,
      crmBotWebhookDispatcher: {
        actionApiBaseUrl: "https://api.example.test/bot/actions",
        dispatch,
      },
      crmConnectionRepository: createMemoryCrmConnectionRepository([
        createOlxConnection(),
      ]),
      crmCanonicalInboundRepository: canonicalRepository,
      crmOlxWebhookSecurity: olxSecurity(),
      crmRealtimePublisher: { publish: publish as never },
      crmWhatsappRepository: whatsappRepository,
      entitlements: ["crm"],
      olxChatEnabled: true,
    });

    const failed = await postOlx(app, validPayload());
    vi.setSystemTime(new Date("2026-08-10T12:02:00.000Z"));
    const recovered = await postOlx(app, validPayload());

    expect(failed.status).toBe(500);
    expect(recovered.status).toBe(200);
    await expect(recovered.json()).resolves.toMatchObject({
      status: "duplicate",
    });
    expect(canonicalRepository.snapshot().messages).toHaveLength(1);
    await expect(
      whatsappRepository.listSessions({
        limit: 10,
        offset: 0,
        storeId,
        tenantId,
      }),
    ).resolves.toEqual([]);
    expect(publish).toHaveBeenCalledTimes(3);
    expect(dispatch).toHaveBeenCalledTimes(1);
  });

  it("rejects inbound OLX webhooks before security or persistence when disabled", async () => {
    const whatsappRepository = createMemoryCrmWhatsappRepository();
    const security = olxSecurity();
    const app = createTestApp({
      crmConnectionRepository: createMemoryCrmConnectionRepository([
        createOlxConnection(),
      ]),
      crmOlxWebhookSecurity: security,
      crmWhatsappRepository: whatsappRepository,
      entitlements: ["crm"],
    });

    const response = await postOlx(app, validPayload());

    expect(response.status).toBe(403);
    expect(security.consume).not.toHaveBeenCalled();
    await expect(
      whatsappRepository.listSessions({
        limit: 10,
        offset: 0,
        storeId,
        tenantId,
      }),
    ).resolves.toEqual([]);
  });
});
