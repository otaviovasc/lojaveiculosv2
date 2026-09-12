import { describe, expect, it } from "vitest";
import {
  billingAuditHealth,
  billingMonitoringNeedsAttention,
} from "./billingProviderReconciliationMonitoring.js";

describe("billing audit outbox monitoring", () => {
  it("reports pending age and dead-letter counts for health alerts", () => {
    expect(
      billingAuditHealth({
        deadLetterCount: 2,
        now: new Date("2026-08-26T12:15:01.000Z"),
        oldestPendingAt: new Date("2026-08-26T12:00:00.000Z"),
        pendingCount: 3,
      }),
    ).toEqual({
      billingAuditDeadLetterCount: 2,
      billingAuditPendingCount: 3,
      oldestBillingAuditPendingAgeSeconds: 901,
    });
  });

  it("does not report a negative age after clock skew", () => {
    expect(
      billingAuditHealth({
        deadLetterCount: 0,
        now: new Date("2026-08-26T12:00:00.000Z"),
        oldestPendingAt: new Date("2026-08-26T12:00:01.000Z"),
        pendingCount: 1,
      }).oldestBillingAuditPendingAgeSeconds,
    ).toBe(0);
  });

  it("alerts on dead letters or audit delivery older than fifteen minutes", () => {
    const healthy = {
      activationOrProjectionFailureCount: 0,
      billingAuditDeadLetterCount: 0,
      missingContractCount: 0,
      oldestBillingAuditPendingAgeSeconds: 900,
      oldestPendingReconciliationAgeSeconds: 900,
      reconciliationFailedHireCount: 0,
    };
    expect(billingMonitoringNeedsAttention(healthy)).toBe(false);
    expect(
      billingMonitoringNeedsAttention({
        ...healthy,
        billingAuditDeadLetterCount: 1,
      }),
    ).toBe(true);
    expect(
      billingMonitoringNeedsAttention({
        ...healthy,
        oldestBillingAuditPendingAgeSeconds: 901,
      }),
    ).toBe(true);
  });
});
