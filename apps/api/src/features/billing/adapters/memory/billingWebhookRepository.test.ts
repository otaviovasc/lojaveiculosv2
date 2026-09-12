import { describe, expect, it } from "vitest";
import { createMemoryBillingWebhookRepository } from "./billingWebhookRepository.js";

describe("memory billing webhook event claims", () => {
  it("allows exactly one concurrent claimant and deduplicates terminal events", async () => {
    const repository = createMemoryBillingWebhookRepository();
    const recorded = await repository.recordReceived({
      environment: "test",
      eventType: "PAYMENT_RECEIVED",
      payload: {},
      provider: "asaas",
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
      status: "processed",
    });
    await expect(claim("token-3")).resolves.toBeNull();
  });

  it("reclaims stale processing and fences the expired owner", async () => {
    const repository = createMemoryBillingWebhookRepository();
    const recorded = await repository.recordReceived({
      environment: "test",
      eventType: "PAYMENT_RECEIVED",
      payload: {},
      provider: "asaas",
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
