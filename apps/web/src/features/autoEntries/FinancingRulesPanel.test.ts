import { describe, expect, it } from "vitest";
import { emptyRankValues } from "./AutoEntryRateMatrix";
import { buildRankMutations, rankValues } from "./FinancingRulesPanel";
import type { AutoEntryRule } from "./types";

describe("financing rank mutations", () => {
  it("deactivates an existing rank when its persisted value is cleared", () => {
    const existing = financingRule();

    const mutations = buildRankMutations(
      [existing],
      emptyRankValues(),
      "store",
      null,
    );

    expect(mutations).toHaveLength(1);
    expect(mutations?.[0]?.ruleId).toBe(existing.id);
    expect(mutations?.[0]?.input).toMatchObject({
      metadata: existing.metadata,
      status: "inactive",
    });
    expect(mutations?.[0]?.input.calculation).toEqual(existing.calculation);
    expect(
      rankValues([{ ...existing, status: "inactive" }], "financing.store"),
    ).toEqual(emptyRankValues());
  });
});

function financingRule(): AutoEntryRule {
  return {
    calculation: { basis: "financing", kind: "rate_ppm", ratePpm: 12_000 },
    category: "Financiamento",
    conditions: { financingRank: "R1" },
    createdAt: "2026-07-13T12:00:00.000Z",
    event: "financing_approved",
    family: "financing.store.R1",
    id: "financing_store_r1",
    metadata: {
      policy: {
        financingRank: "R1",
        product: "financing",
        storeRatePpm: 12_000,
      },
    },
    name: "Receita da loja no financiamento R1",
    outputType: "revenue",
    priority: 0,
    recipient: { kind: "none" },
    resolution: "additive",
    ruleKey: "financing.store.R1",
    sellerUserId: null,
    status: "active",
    timing: { kind: "same_day" },
    updatedAt: "2026-07-13T12:00:00.000Z",
  };
}
