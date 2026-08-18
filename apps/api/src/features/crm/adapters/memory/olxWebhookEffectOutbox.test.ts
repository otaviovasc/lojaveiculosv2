import { afterEach, describe, expect, it, vi } from "vitest";
import {
  deliverClaimedOlxWebhookEffect,
  failClaimedOlxWebhookEffect,
} from "../../../../domains/crm/messaging/olxWebhookEffectOutbox.js";
import { createServiceContext } from "../../../../shared/serviceContext.js";
import { createMemoryCrmWebhookEventRepository } from "./crmWebhookEventRepository.js";

describe("OLX webhook durable effects", () => {
  afterEach(() => vi.useRealTimers());

  it("backs off failures and dead-letters the final attempt", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-08-10T12:00:00.000Z"));
    const repository = createMemoryCrmWebhookEventRepository();
    const event = await repository.recordReceived({
      connectionId: "connection-1",
      environment: "test",
      eventType: "crm.messaging.olx.received",
      payload: {},
      provider: "olx",
      providerEventId: "olx:event-1",
      storeId: "store-1" as never,
      tenantId: "tenant-1" as never,
    });
    await repository.stageEffects({
      connectionId: "connection-1",
      effects: [
        { effectType: "audit_accepted", sequence: 10 },
        { effectType: "realtime_message", sequence: 20 },
      ],
      messageId: "message-1",
      providerEventId: event.event.id,
      cycleId: "cycle-1",
      storeId: "store-1" as never,
      tenantId: "tenant-1" as never,
    });
    let attemptAt = new Date("2026-08-10T12:00:00.000Z");
    let failed;
    for (let attempt = 1; attempt <= 8; attempt += 1) {
      const [claimed] = await repository.claimDueEffects({
        limit: 10,
        maxAttempts: 8,
        now: attemptAt,
        processingToken: `claim-${attempt}`,
        staleBefore: new Date(attemptAt.getTime() - 300_000),
      });
      failed = await failClaimedOlxWebhookEffect(
        repository,
        claimed!,
        new Error("audit unavailable"),
        attemptAt,
      );
      attemptAt = failed.nextAttemptAt;
    }

    expect(failed?.deadLetteredAt).toBeInstanceOf(Date);
    expect(failed?.status).toBe("dead_letter");
    await expect(
      repository.claimDueEffects({
        limit: 10,
        maxAttempts: 8,
        now: new Date("2026-08-11T12:00:00.000Z"),
        processingToken: "claim-2",
        staleBefore: attemptAt,
      }),
    ).resolves.toEqual([]);
  });

  it("requires accepted audit persistence before delivery", async () => {
    const auditFailure = new Error("audit database unavailable");
    const audit = { record: vi.fn(async () => Promise.reject(auditFailure)) };
    const context = createServiceContext({
      audit,
      permissions: ["crm.messages.ingest"],
      request: { requestId: "olx-audit-test" },
    });

    await expect(
      deliverClaimedOlxWebhookEffect(
        context,
        { effectType: "audit_accepted", id: "effect-1" },
        {
          connection: {
            id: "connection-1",
            storeId: "store-1",
            tenantId: "tenant-1",
          } as never,
          message: {} as never,
          providerEventReference: "olx:event-1",
          conversationCycle: {} as never,
        },
        { crmRepository: {} as never },
      ),
    ).rejects.toBe(auditFailure);
    expect(audit.record).toHaveBeenCalledWith(
      expect.objectContaining({
        failureTier: "required",
        id: "effect-1",
      }),
    );
  });
});
