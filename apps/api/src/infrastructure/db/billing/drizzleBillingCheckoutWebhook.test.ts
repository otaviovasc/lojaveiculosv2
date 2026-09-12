import { describe, expect, it } from "vitest";
import { isMonotonicCheckoutTransition } from "./drizzleBillingCheckoutWebhook.js";

describe("isMonotonicCheckoutTransition", () => {
  it("accepts creation followed by one provider terminal state", () => {
    expect(isMonotonicCheckoutTransition("created", "paid")).toBe(true);
    expect(isMonotonicCheckoutTransition("created", "cancelled")).toBe(true);
    expect(isMonotonicCheckoutTransition("created", "expired")).toBe(true);
  });

  it("keeps every provider terminal state monotonic and idempotent", () => {
    for (const status of ["paid", "cancelled", "expired"] as const) {
      expect(isMonotonicCheckoutTransition(status, status)).toBe(true);
      expect(isMonotonicCheckoutTransition(status, "created")).toBe(false);
    }
    expect(isMonotonicCheckoutTransition("paid", "cancelled")).toBe(false);
    expect(isMonotonicCheckoutTransition("paid", "expired")).toBe(false);
    expect(isMonotonicCheckoutTransition("cancelled", "paid")).toBe(false);
    expect(isMonotonicCheckoutTransition("expired", "paid")).toBe(false);
  });
});
