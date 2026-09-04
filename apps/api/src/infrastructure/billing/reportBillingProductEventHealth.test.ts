import { describe, expect, it, vi } from "vitest";
import type { ServiceLogger } from "../../shared/serviceContext.js";
import { reportBillingProductEventHealth } from "./reportBillingProductEventHealth.js";

describe("billing product-event health reporting", () => {
  it("alerts on an aged backlog even when delivery is disabled", () => {
    const logger = testLogger();
    const result = reportBillingProductEventHealth({
      logger,
      maxPendingAgeSeconds: 900,
      snapshot: {
        failedCount: 0,
        oldestPendingAgeSeconds: 901,
        pendingCount: 3,
        requeueCount: 0,
        retryingCount: 0,
      },
    });
    expect(result.attentionRequired).toBe(true);
    expect(logger.info).toHaveBeenCalledWith(
      "metric.billing_product_event.outbox",
      expect.objectContaining({ pendingCount: 3 }),
    );
    expect(logger.error).toHaveBeenCalledWith(
      "alert.billing_product_event.delivery_attention_required",
      expect.objectContaining({ oldestPendingAgeSeconds: 901 }),
    );
  });

  it("alerts on retained terminal failures without inventing delivery", () => {
    const logger = testLogger();
    expect(
      reportBillingProductEventHealth({
        logger,
        maxPendingAgeSeconds: 900,
        snapshot: {
          failedCount: 1,
          oldestPendingAgeSeconds: 0,
          pendingCount: 0,
          requeueCount: 1,
          retryingCount: 0,
        },
      }).attentionRequired,
    ).toBe(true);
    expect(logger.error).toHaveBeenCalledOnce();
  });
});

function testLogger(): ServiceLogger {
  return {
    error: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
  };
}
