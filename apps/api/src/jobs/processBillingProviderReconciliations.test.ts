import { describe, expect, it } from "vitest";
import {
  billingProviderEventCanReplay,
  billingProviderEventIsExhausted,
  billingProviderEventRetryDelayMs,
  orderReplayCandidates,
  providerEventExhaustedError,
} from "./billingProviderEventReplayPolicy.js";

describe("billing provider event replay", () => {
  it("rotates a 51st event ahead of the touched first batch", () => {
    const createdAt = new Date("2026-08-26T10:00:00.000Z");
    const events = Array.from({ length: 51 }, (_, index) => ({
      createdAt: new Date(createdAt.getTime() + index),
      id: `event_${String(index + 1).padStart(2, "0")}`,
      updatedAt: new Date(createdAt.getTime() + index),
    }));
    const firstBatch = orderReplayCandidates(events).slice(0, 50);
    const touchedAt = new Date("2026-08-26T11:00:00.000Z");
    const touched = new Set(firstBatch.map((event) => event.id));
    const nextBatch = orderReplayCandidates(
      events.map((event) => ({
        ...event,
        updatedAt: touched.has(event.id) ? touchedAt : event.updatedAt,
      })),
    ).slice(0, 50);

    expect(firstBatch).toHaveLength(50);
    expect(firstBatch.some((event) => event.id === "event_51")).toBe(false);
    expect(nextBatch[0]?.id).toBe("event_51");
  });

  it("retries failed and abandoned leases only after bounded backoff", () => {
    const now = new Date("2026-08-26T12:00:00.000Z");
    const failed = {
      processingAttempts: 2,
      processingStartedAt: null,
      status: "failed" as const,
      updatedAt: new Date(now.getTime() - 10_000),
    };

    expect(billingProviderEventCanReplay(failed, now)).toBe(true);
    expect(
      billingProviderEventCanReplay(
        { ...failed, updatedAt: new Date(now.getTime() - 9_999) },
        now,
      ),
    ).toBe(false);
    expect(
      billingProviderEventCanReplay({ ...failed, processingAttempts: 12 }, now),
    ).toBe(false);
    expect(billingProviderEventRetryDelayMs(100)).toBe(300_000);
    expect(
      billingProviderEventCanReplay(
        {
          ...failed,
          processingAttempts: 1,
          processingStartedAt: new Date(now.getTime() - 300_000),
          status: "processing",
        },
        now,
      ),
    ).toBe(true);
    expect(
      billingProviderEventCanReplay(
        {
          ...failed,
          processingAttempts: 1,
          processingStartedAt: new Date(now.getTime() - 299_999),
          status: "processing",
        },
        now,
      ),
    ).toBe(false);
  });

  it("classifies exhausted reconciliation work for an observable dead letter", () => {
    expect(
      billingProviderEventIsExhausted({
        processingAttempts: 12,
        status: "pending_reconciliation",
      }),
    ).toBe(true);
    expect(
      billingProviderEventIsExhausted({
        processingAttempts: 11,
        status: "pending_reconciliation",
      }),
    ).toBe(false);
    expect(
      billingProviderEventIsExhausted({
        processingAttempts: 12,
        status: "processed",
      }),
    ).toBe(false);
    expect(providerEventExhaustedError).toBe(
      "provider_reconciliation_attempts_exhausted",
    );
  });
});
