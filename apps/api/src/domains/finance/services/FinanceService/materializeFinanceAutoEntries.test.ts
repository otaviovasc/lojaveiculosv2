import { describe, expect, it } from "vitest";
import { createFinanceAutoEntryRule } from "./createFinanceAutoEntryRule.js";
import { financeAutoEntryV1DefaultRuleKeys } from "../../financeAutoEntryDefaults.js";
import { calculateFinanceAutoEntryDueAt } from "./financeAutoEntryEvaluator.js";
import { materializeFinanceAutoEntries } from "./materializeFinanceAutoEntries.js";
import {
  createMaterializationPorts,
  financeAutoEntryContext,
  saleId,
  sellerId,
  unitId,
} from "../../testSupportMaterializeFinanceAutoEntries.js";

describe("automatic finance entry materialization", () => {
  it("adds seller rules to global rules, links the sale, and is retry-safe", async () => {
    const ports = createMaterializationPorts();
    const manager = financeAutoEntryContext([
      "finance.auto_entries.manage",
      "finance.read",
    ]);
    const defaultCommission = await createFinanceAutoEntryRule(
      manager,
      {
        calculation: {
          basis: "sale",
          basisPoints: 200,
          kind: "percentage",
        },
        event: "vehicle_sale_closed",
        outputType: "commission",
        priority: 10,
        timing: { kind: "same_day" },
      },
      ports,
    );
    const sellerCommission = await createFinanceAutoEntryRule(
      manager,
      {
        calculation: {
          basis: "sale",
          basisPoints: 375,
          kind: "percentage",
        },
        event: "vehicle_sale_closed",
        outputType: "commission",
        priority: 20,
        sellerUserId: sellerId,
        timing: { day: 31, kind: "next_month_day" },
      },
      ports,
    );
    const input = {
      basisCents: { sale: 200_000 },
      event: "vehicle_sale_closed" as const,
      occurredAt: new Date("2026-01-31T15:00:00.000Z"),
      saleId,
      sellerUserId: sellerId,
      sourceId: saleId,
      sourceRevision: 1,
      unitId,
    };

    const first = await materializeFinanceAutoEntries(
      financeAutoEntryContext(["sale.close"]),
      input,
      ports,
    );
    expect(first).toHaveLength(2);
    expect(first.map((item) => item.rule.id)).toEqual(
      expect.arrayContaining([sellerCommission.id, defaultCommission.id]),
    );
    const commission = first.find(
      (item) => item.rule.id === sellerCommission.id,
    );
    expect(commission).toMatchObject({
      created: true,
      entry: {
        entry: { amountCents: 7500, sellerUserId: sellerId },
      },
      execution: {
        calculationSnapshot: {
          amountCents: 7500,
          basisAmountCents: 200_000,
          dueAt: "2026-02-28T15:00:00.000Z",
        },
      },
    });
    expect(commission?.entry.links).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ targetId: saleId, targetType: "sale" }),
        expect.objectContaining({
          targetId: unitId,
          targetType: "vehicle_unit",
        }),
      ]),
    );

    const retry = await materializeFinanceAutoEntries(
      financeAutoEntryContext(["sale.close"]),
      input,
      ports,
    );
    expect(retry.every((item) => !item.created)).toBe(true);
    expect(retry.map((item) => item.entry.entry.id)).toEqual(
      first.map((item) => item.entry.entry.id),
    );
  });

  it("calculates calendar timing deterministically in UTC", () => {
    const occurredAt = new Date("2026-01-20T09:30:00.000Z");
    expect(
      calculateFinanceAutoEntryDueAt(occurredAt, {
        day: 15,
        kind: "day_of_month",
      }).toISOString(),
    ).toBe("2026-02-15T09:30:00.000Z");
    expect(
      calculateFinanceAutoEntryDueAt(occurredAt, {
        days: 365,
        kind: "days_after",
      }).toISOString(),
    ).toBe("2027-01-20T09:30:00.000Z");
  });

  it("materializes only the matching financing rank from provisioned defaults", async () => {
    const ports = createMaterializationPorts();
    const result = await materializeFinanceAutoEntries(
      financeAutoEntryContext(["sale.close"]),
      {
        attributes: { financingRank: "R3" },
        basisCents: { financing: 100_000 },
        event: "financing_approved",
        occurredAt: new Date("2026-02-01T12:00:00.000Z"),
        sellerUserId: sellerId,
        sourceId: saleId,
        sourceRevision: 1,
      },
      ports,
    );

    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      entry: {
        entry: {
          amountCents: 3_600,
          sellerUserId: null,
          type: "revenue",
        },
      },
      rule: { ruleKey: "financing.store.R3" },
    });
  });

  it("materializes transfer cost and revenue while applying the lien condition", async () => {
    const ports = createMaterializationPorts();
    const result = await materializeFinanceAutoEntries(
      financeAutoEntryContext(["sale.close"]),
      {
        attributes: { transferHasLien: false },
        basisCents: { documentation: 70_000 },
        event: "transfer_documentation_charged",
        occurredAt: new Date("2026-02-01T12:00:00.000Z"),
        saleId,
        sellerUserId: sellerId,
        sourceId: saleId,
        sourceRevision: 1,
      },
      ports,
    );

    expect(result).toHaveLength(2);
    expect(
      result.map((item) => ({
        amountCents: item.entry.entry.amountCents,
        ruleKey: item.rule.ruleKey,
        type: item.entry.entry.type,
      })),
    ).toEqual(
      expect.arrayContaining([
        {
          amountCents: 50_000,
          ruleKey: financeAutoEntryV1DefaultRuleKeys.transferCostNoLien,
          type: "expense",
        },
        {
          amountCents: 70_000,
          ruleKey: financeAutoEntryV1DefaultRuleKeys.transferRevenue,
          type: "revenue",
        },
      ]),
    );
  });
});
