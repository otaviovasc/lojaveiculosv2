import { describe, expect, it } from "vitest";
import {
  planCheckoutMode,
  planSelectionRank,
} from "./drizzleBillingPlanHireSupport.js";

describe("billing plan hire catalog metadata", () => {
  it("reads the canonical snake_case metadata persisted in plan limits", () => {
    const plan = {
      code: "escala",
      limits: {
        checkout_mode: "quote_required",
        selection_rank: 5,
      },
      monthlyPriceCents: 89_700,
    } as Parameters<typeof planSelectionRank>[0];

    expect(planCheckoutMode(plan)).toBe("quote_required");
    expect(planSelectionRank(plan)).toBe(5);
  });

  it("keeps legacy camelCase metadata readable", () => {
    const plan = {
      code: "operacao",
      limits: { checkoutMode: "checkout", selectionRank: 3 },
      monthlyPriceCents: 39_700,
    } as Parameters<typeof planSelectionRank>[0];

    expect(planCheckoutMode(plan)).toBe("checkout");
    expect(planSelectionRank(plan)).toBe(3);
  });
});
