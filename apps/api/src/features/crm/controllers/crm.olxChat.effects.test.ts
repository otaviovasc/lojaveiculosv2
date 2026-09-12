import { afterEach, describe, expect, it, vi } from "vitest";
import { createMemoryCrmExternalBotIntegrationRepository } from "../adapters/memory/crmExternalBotIntegrationRepository.js";
import { createMemoryCrmConnectionRepository } from "../adapters/memory/crmConnectionRepository.js";
import { createMemoryCrmCanonicalInboundRepository } from "../adapters/memory/crmCanonicalInboundRepository.js";
import { createMemoryCrmConversationRepository } from "../adapters/memory/crmConversationRepository.js";
import {
  createOlxConnection,
  olxSecurity,
  postOlx,
  storeId,
  tenantId,
  validPayload,
} from "./crm.olxChat.testSupport.js";
import { createTestApp } from "./crm.controller.testSupport.js";

afterEach(() => vi.useRealTimers());

describe("CRM OLX Chat effects", () => {
  it("rate-limits before ingesting or auditing an accepted OLX event", async () => {
    const audit = { record: vi.fn(async () => undefined) };
    const conversationRepository = createMemoryCrmConversationRepository();
    const app = createTestApp({
      audit,
      crmConnectionRepository: createMemoryCrmConnectionRepository([
        createOlxConnection(),
      ]),
      crmOlxWebhookSecurity: olxSecurity({ allowed: false }),
      crmConversationRepository: conversationRepository,
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
    const conversationRepository = createMemoryCrmConversationRepository();
    const canonicalRepository = createMemoryCrmCanonicalInboundRepository(
      conversationRepository,
    );
    const botRepository = createMemoryCrmExternalBotIntegrationRepository();
    await botRepository.upsertExternalBotIntegration({
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
    const app = createTestApp({
      crmExternalBotIntegrationRepository: botRepository,
      crmConnectionRepository: createMemoryCrmConnectionRepository([
        createOlxConnection(),
      ]),
      crmCanonicalInboundRepository: canonicalRepository,
      crmOlxWebhookSecurity: olxSecurity(),
      crmRealtimePublisher: { publish: publish as never },
      crmConversationRepository: conversationRepository,
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
    await expect(
      conversationRepository.listMessages({
        cycleId:
          (
            await conversationRepository.listConversationCycles({
              limit: 1,
              offset: 0,
              storeId,
              tenantId,
            })
          )[0]?.id ?? "",
        limit: 10,
        offset: 0,
        storeId,
        tenantId,
      }),
    ).resolves.toHaveLength(1);
    await expect(
      conversationRepository.listConversationCycles({
        limit: 10,
        offset: 0,
        storeId,
        tenantId,
      }),
    ).resolves.toHaveLength(1);
    expect(publish).toHaveBeenCalledTimes(3);
  });

  it("rejects inbound OLX webhooks before security or persistence when disabled", async () => {
    const conversationRepository = createMemoryCrmConversationRepository();
    const security = olxSecurity();
    const app = createTestApp({
      crmConnectionRepository: createMemoryCrmConnectionRepository([
        createOlxConnection(),
      ]),
      crmOlxWebhookSecurity: security,
      crmConversationRepository: conversationRepository,
      entitlements: ["crm"],
    });

    const response = await postOlx(app, validPayload());

    expect(response.status).toBe(403);
    expect(security.consume).not.toHaveBeenCalled();
    await expect(
      conversationRepository.listConversationCycles({
        limit: 10,
        offset: 0,
        storeId,
        tenantId,
      }),
    ).resolves.toEqual([]);
  });
});
