import { describe, expect, it } from "vitest";
import {
  freeFallbackAuditRecord,
  paidHireBelongsToEffectiveItem,
} from "./drizzleBillingFreeFallbackStore.js";

describe("billing Free fallback store projection", () => {
  it("transitions only the hire linked to the current effective paid contract", () => {
    const hires = [
      { effectiveSubscriptionItemId: "historical_paid_item" },
      { effectiveSubscriptionItemId: "current_paid_item" },
    ];
    expect(
      hires.filter((hire) =>
        paidHireBelongsToEffectiveItem(hire, "current_paid_item"),
      ),
    ).toEqual([{ effectiveSubscriptionItemId: "current_paid_item" }]);
  });

  it("creates stable sanitized audit evidence for Free fallback", () => {
    const event = freeFallbackAuditRecord(
      {
        currentPeriodEnd: new Date("2026-08-26T12:00:00.000Z"),
        id: "00000000-0000-4000-8000-000000000001",
        tenantId: "00000000-0000-4000-8000-000000000002",
      },
      "00000000-0000-4000-8000-000000000003",
      new Date("2026-08-27T12:00:00.000Z"),
    );
    expect(event).toMatchObject({
      action: "billing.subscription.free_fallback",
      idempotencyKey:
        "billing-audit:fallback:00000000-0000-4000-8000-000000000001:00000000-0000-4000-8000-000000000003:2026-08-26T12:00:00.000Z",
      metadata: { reason: "grace_expired", status: "free_active" },
    });
    expect(JSON.stringify(event)).not.toContain("providerPayload");
  });
});
