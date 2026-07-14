import { describe, expect, it } from "vitest";
import {
  familyRules,
  findRule,
  formatRatePpm,
  parseRatePpm,
  rateRule,
  readPolicyNumber,
  ruleRateInput,
  toMutation,
} from "./domainModel";
import type { AutoEntryRule } from "./types";

describe("auto-entry domain model", () => {
  it("preserves ppm precision used by seller commission matrices", () => {
    expect(parseRatePpm("0,277")).toBe(2_770);
    expect(parseRatePpm("0,18")).toBe(1_800);
    expect(parseRatePpm("100")).toBe(1_000_000);
    expect(parseRatePpm("0")).toBeNull();
    expect(parseRatePpm("100,0001")).toBeNull();
    expect(formatRatePpm(2_770)).toBe("0,277");
  });

  it("matches domain rules by key, family and applicability seller", () => {
    const global = rule({
      family: "sale.standard_commission",
      ruleKey: "sale.standard_commission",
    });
    const seller = rule({
      family: "sale.standard_commission",
      id: "seller_rule",
      ruleKey: "sale.standard_commission",
      sellerUserId: "seller-1",
    });
    const rules = [global, seller];

    expect(findRule(rules, "sale.standard_commission", null)).toBe(global);
    expect(findRule(rules, "sale.standard_commission", "seller-1")).toBe(
      seller,
    );
    expect(familyRules(rules, "sale.standard_commission")).toEqual(rules);
  });

  it("reads actual policy values and builds the canonical recipient contract", () => {
    const current = rule({
      calculation: {
        basis: "consortium",
        kind: "rate_ppm",
        ratePpm: 2_770,
      },
      metadata: { policy: { sellerRatePpm: 2_770 } },
    });
    expect(ruleRateInput(current)).toBe("0,277");
    expect(readPolicyNumber(current, ["sellerRatePpm"])).toBe(2_770);

    const input = rateRule({
      basis: "premium",
      event: "insurance_issued",
      family: "insurance.seller",
      name: "Comissão do vendedor no seguro",
      outputType: "commission",
      ratePpm: 7_500,
      recipient: { kind: "event_seller" },
      resolution: "seller_override",
      ruleKey: "insurance.seller",
    });
    expect(toMutation(undefined, input)).toEqual({ input, ruleId: null });
    expect(input.recipient).toEqual({ kind: "event_seller" });
    expect(input.resolution).toBe("seller_override");
  });
});

function rule(overrides: Partial<AutoEntryRule> = {}): AutoEntryRule {
  return {
    calculation: { amountCents: 50_000, kind: "fixed" },
    category: "Comissão",
    conditions: {},
    createdAt: "2026-07-13T12:00:00.000Z",
    event: "vehicle_sale_closed",
    family: null,
    id: "rule-1",
    metadata: {},
    name: "Regra",
    outputType: "commission",
    priority: 0,
    recipient: { kind: "event_seller" },
    resolution: "additive",
    ruleKey: null,
    sellerUserId: null,
    status: "active",
    timing: { kind: "same_day" },
    updatedAt: "2026-07-13T12:00:00.000Z",
    ...overrides,
  };
}
