import { describe, expect, it } from "vitest";
import { createMemoryCrmWebhookEventRepository } from "./crmWebhookEventRepository.js";

describe("memory CRM webhook event claims", () => {
  it("distinguishes exact and divergent replays without retaining replay content", async () => {
    const repository = createMemoryCrmWebhookEventRepository();
    const input = {
      connectionId: "00000000-0000-4000-8000-000000000001",
      environment: "test",
      eventType: "crm.messaging.olx.received",
      payload: { schemaVersion: 1 },
      payloadDigest: "a".repeat(64),
      provider: "olx" as const,
      providerEventId: "olx:message-1",
    };

    const first = await repository.recordReceived(input);
    const exact = await repository.recordReceived(input);
    const divergent = await repository.recordReceived({
      ...input,
      payload: { plaintext: "must-not-be-retained" },
      payloadDigest: "b".repeat(64),
    });

    expect(first).toMatchObject({ created: true, divergentReplay: false });
    expect(exact).toMatchObject({ created: false, divergentReplay: false });
    expect(divergent).toMatchObject({ created: false, divergentReplay: true });
    expect(divergent.event.payload).toEqual({ schemaVersion: 1 });
    expect(JSON.stringify(divergent.event)).not.toContain(
      "must-not-be-retained",
    );
  });

  it("allows exactly one concurrent claimant and deduplicates terminal events", async () => {
    const repository = createMemoryCrmWebhookEventRepository();
    const recorded = await repository.recordReceived({
      connectionId: "00000000-0000-4000-8000-000000000001",
      environment: "test",
      eventType: "crm.whatsapp.zapi.received",
      payload: {},
      provider: "zapi",
      providerEventId: "evt_concurrent",
    });
    const now = new Date("2026-08-10T12:00:00.000Z");
    const claim = (processingToken: string) =>
      repository.claimForProcessing({
        eventId: recorded.event.id,
        processingStartedAt: now,
        processingToken,
        staleBefore: new Date(now.getTime() - 300_000),
      });

    const claims = await Promise.all([claim("token-1"), claim("token-2")]);
    expect(claims.filter(Boolean)).toHaveLength(1);
    const winner = claims.find(Boolean)!;
    await repository.updateStatus({
      eventId: winner.id,
      processingToken: winner.processingToken!,
      status: "ignored",
    });
    await expect(claim("token-3")).resolves.toBeNull();
  });

  it("reclaims stale processing and fences the expired owner", async () => {
    const repository = createMemoryCrmWebhookEventRepository();
    const recorded = await repository.recordReceived({
      environment: "test",
      eventType: "crm.whatsapp.zapi.received",
      payload: {},
      provider: "zapi",
      providerEventId: "evt_stale",
    });
    const oldStartedAt = new Date("2026-08-10T11:00:00.000Z");
    await repository.claimForProcessing({
      eventId: recorded.event.id,
      processingStartedAt: oldStartedAt,
      processingToken: "old-token",
      staleBefore: new Date(oldStartedAt.getTime() - 300_000),
    });
    const newStartedAt = new Date("2026-08-10T12:00:00.000Z");
    const reclaimed = await repository.claimForProcessing({
      eventId: recorded.event.id,
      processingStartedAt: newStartedAt,
      processingToken: "new-token",
      staleBefore: new Date(newStartedAt.getTime() - 300_000),
    });

    expect(reclaimed).toMatchObject({
      processingAttempts: 2,
      processingToken: "new-token",
      status: "processing",
    });
    await expect(
      repository.updateStatus({
        eventId: recorded.event.id,
        processingToken: "old-token",
        status: "processed",
      }),
    ).resolves.toBeNull();
  });
});
