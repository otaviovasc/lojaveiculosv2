import { describe, expect, it } from "vitest";
import {
  formatCentsForInput,
  idealSellPriceCents,
  recommendedAcquisitionCents,
} from "./inventoryPricing";

describe("inventory pricing helpers", () => {
  it("calculates FIPE based acquisition and sale suggestions", () => {
    expect(recommendedAcquisitionCents(10000000)).toBe(8200000);
    expect(idealSellPriceCents(10000000)).toBe(9700000);
    expect(recommendedAcquisitionCents(null)).toBeNull();
  });

  it("formats cents for BR input fields", () => {
    expect(formatCentsForInput(7290000)).toBe("72.900,00");
  });
});
