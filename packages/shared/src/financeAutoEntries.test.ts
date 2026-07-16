import { describe, expect, it } from "vitest";
import {
  financeAutoEntryEvents,
  financeAutoEntryFinancingRanks,
  financeAutoEntryMaxAmountCents,
  financeAutoEntryMaxRatePpm,
  financeAutoEntryOutputTypes,
  financeAutoEntryPercentageBases,
  financeAutoEntryRecipientKinds,
  financeAutoEntryRuleResolutions,
  financeAutoEntryRuleStatuses,
  financeAutoEntryTimingKinds,
} from "./financeAutoEntries.js";

describe("finance auto-entry contract", () => {
  it("keeps the supported runtime catalogs stable", () => {
    expect(financeAutoEntryEvents).toEqual([
      "vehicle_sale_closed",
      "financing_approved",
      "insurance_issued",
      "transfer_documentation_charged",
      "consortium_sold",
    ]);
    expect(financeAutoEntryOutputTypes).toEqual([
      "expense",
      "revenue",
      "commission",
    ]);
    expect(financeAutoEntryRuleStatuses).toEqual(["active", "inactive"]);
    expect(financeAutoEntryRuleResolutions).toEqual([
      "additive",
      "seller_override",
    ]);
    expect(financeAutoEntryRecipientKinds).toEqual([
      "event_seller",
      "fixed_user",
      "none",
    ]);
    expect(financeAutoEntryFinancingRanks).toEqual([
      "R1",
      "R2",
      "R3",
      "R4",
      "R5",
    ]);
    expect(financeAutoEntryPercentageBases).toEqual([
      "sale",
      "commission",
      "financing",
      "premium",
      "insurance_commission",
      "documentation",
      "consortium",
    ]);
    expect(financeAutoEntryTimingKinds).toEqual([
      "same_day",
      "days_after",
      "day_of_month",
      "next_month_day",
    ]);
  });

  it("keeps the runtime amount and rate bounds explicit", () => {
    expect(financeAutoEntryMaxAmountCents).toBe(2_147_483_647);
    expect(financeAutoEntryMaxRatePpm).toBe(1_000_000);
  });
});
