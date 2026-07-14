import { describe, expect, it } from "vitest";
import type { FinanceAutoEntryRule } from "../../ports/financeAutoEntryRepository.js";
import { resolveApplicableFinanceAutoEntryRules } from "./financeAutoEntryEvaluator.js";
import {
  normalizeFinanceAutoEntryRuleDefinition,
  type FinanceAutoEntryRuleDefinition,
} from "./financeAutoEntryRuleValidation.js";

describe("standard commission auto-entry gate", () => {
  it("blocks the entire legacy standard family while keeping extras", () => {
    const standard = rule({
      family: "sale.standard_commission",
      id: "standard",
      resolution: "seller_override",
      ruleKey: "sale.standard_commission",
    });
    const extra = rule({ family: "sale.extra_commission", id: "extra" });

    const disabled = resolveApplicableFinanceAutoEntryRules(
      [standard, extra],
      null,
      { attributes: { standardCommissionEnabled: false } },
    );
    expect(disabled.map(({ id }) => id)).toEqual(["extra"]);

    const enabled = resolveApplicableFinanceAutoEntryRules(
      [standard, extra],
      null,
      { attributes: { standardCommissionEnabled: true } },
    );
    expect(enabled.map(({ id }) => id)).toEqual(
      expect.arrayContaining(["extra", "standard"]),
    );
  });

  it("requires the typed true condition on new standard-family rules", () => {
    const standard = definition({
      family: "sale.standard_commission",
      ruleKey: "sale.standard_commission",
    });

    expect(() => normalizeFinanceAutoEntryRuleDefinition(standard)).toThrow(
      "sale.standard_commission rules require standardCommissionEnabled true",
    );
    expect(
      normalizeFinanceAutoEntryRuleDefinition({
        ...standard,
        conditions: { standardCommissionEnabled: true },
      }).conditions,
    ).toEqual({ standardCommissionEnabled: true });
  });
});

function rule(overrides: Partial<FinanceAutoEntryRule>): FinanceAutoEntryRule {
  const now = new Date("2026-07-13T12:00:00.000Z");
  return {
    ...definition(),
    createdAt: now,
    id: "rule",
    metadata: {},
    storeId: "store_1",
    tenantId: "tenant_1",
    updatedAt: now,
    ...overrides,
  };
}

function definition(
  overrides: Partial<FinanceAutoEntryRuleDefinition> = {},
): FinanceAutoEntryRuleDefinition {
  return {
    calculation: { amountCents: 1_000, kind: "fixed" },
    category: "Comissão",
    conditions: {},
    event: "vehicle_sale_closed",
    family: null,
    name: "Comissão",
    outputType: "commission",
    priority: 0,
    recipient: { kind: "event_seller" },
    resolution: "additive",
    ruleKey: null,
    sellerUserId: null,
    status: "active",
    timing: { kind: "same_day" },
    ...overrides,
  };
}
