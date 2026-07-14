import { describe, expect, it } from "vitest";
import type { FinanceAutoEntryRule } from "../../ports/financeAutoEntryRepository.js";
import { createFinanceAutoEntryRule } from "./createFinanceAutoEntryRule.js";
import { financeAutoEntryV1DefaultRuleKeys } from "../../financeAutoEntryDefaults.js";
import { calculateFinanceAutoEntryAmount } from "./financeAutoEntryEvaluator.js";
import { materializeFinanceAutoEntries } from "./materializeFinanceAutoEntries.js";
import {
  createMaterializationPorts,
  financeAutoEntryContext,
  fixedRecipientId,
  leadId,
  saleId,
  sellerId,
} from "../../testSupportMaterializeFinanceAutoEntries.js";

describe("automatic finance entry V1 parity", () => {
  it("keeps ppm precision and links consortium entries to the lead", async () => {
    const result = await materializeFinanceAutoEntries(
      financeAutoEntryContext(["sale.close"]),
      {
        basisCents: { consortium: 100_000 },
        event: "consortium_sold",
        leadId,
        occurredAt: new Date("2026-02-01T12:00:00.000Z"),
        sellerUserId: sellerId,
        sourceId: leadId,
        sourceRevision: 1,
      },
      createMaterializationPorts(),
    );

    expect(result).toHaveLength(2);
    expect(
      result.map((item) => [item.rule.ruleKey, item.entry.entry.amountCents]),
    ).toEqual(
      expect.arrayContaining([
        [financeAutoEntryV1DefaultRuleKeys.consortiumStore, 1_850],
        [financeAutoEntryV1DefaultRuleKeys.consortiumSeller, 277],
      ]),
    );
    expect(
      result.every((item) =>
        item.entry.links.some(
          (link) => link.targetId === leadId && link.targetType === "lead",
        ),
      ),
    ).toBe(true);
  });

  it("passes through explicit commission and applies the seller override", async () => {
    const baseInput = {
      attributes: { standardCommissionEnabled: true },
      basisCents: { commission: 12_345 },
      event: "vehicle_sale_closed" as const,
      occurredAt: new Date("2026-02-01T12:00:00.000Z"),
      saleId,
      sellerUserId: sellerId,
      sourceId: saleId,
      sourceRevision: 1,
    };
    const passthrough = await materializeFinanceAutoEntries(
      financeAutoEntryContext(["sale.close"]),
      baseInput,
      createMaterializationPorts(),
    );
    expect(passthrough[0]).toMatchObject({
      entry: { entry: { amountCents: 12_345, sellerUserId: sellerId } },
      rule: {
        ruleKey: financeAutoEntryV1DefaultRuleKeys.saleStandardCommission,
      },
    });

    const overridePorts = createMaterializationPorts();
    const override = await createFinanceAutoEntryRule(
      financeAutoEntryContext(["finance.auto_entries.manage"]),
      {
        calculation: { amountCents: 9_999, kind: "fixed" },
        conditions: { standardCommissionEnabled: true },
        event: "vehicle_sale_closed",
        family: financeAutoEntryV1DefaultRuleKeys.saleStandardCommission,
        outputType: "commission",
        recipient: { kind: "event_seller" },
        resolution: "seller_override",
        ruleKey: financeAutoEntryV1DefaultRuleKeys.saleStandardCommission,
        sellerUserId: sellerId,
        timing: { kind: "same_day" },
      },
      overridePorts,
    );
    const overridden = await materializeFinanceAutoEntries(
      financeAutoEntryContext(["sale.close"]),
      { ...baseInput, basisCents: { sale: 5_000_000 } },
      overridePorts,
    );
    expect(overridden).toHaveLength(1);
    expect(overridden[0]).toMatchObject({
      entry: { entry: { amountCents: 9_999 } },
      rule: { id: override.id },
    });
  });

  it("gates only standard commission when the sale disables it", async () => {
    const ports = createMaterializationPorts();
    const extra = await createFinanceAutoEntryRule(
      financeAutoEntryContext(["finance.auto_entries.manage"]),
      {
        calculation: { amountCents: 2_500, kind: "fixed" },
        conditions: {},
        event: "vehicle_sale_closed",
        family: "sale.extra_commission",
        outputType: "commission",
        recipient: { kind: "event_seller" },
        timing: { kind: "same_day" },
      },
      ports,
    );

    const result = await materializeFinanceAutoEntries(
      financeAutoEntryContext(["sale.close"]),
      {
        attributes: { standardCommissionEnabled: false },
        basisCents: { commission: 12_345 },
        event: "vehicle_sale_closed",
        occurredAt: new Date("2026-02-01T12:00:00.000Z"),
        saleId,
        sellerUserId: sellerId,
        sourceId: saleId,
        sourceRevision: 1,
      },
      ports,
    );

    expect(result).toHaveLength(1);
    expect(result[0]?.rule.id).toBe(extra.id);
  });

  it("routes a fixed_user rule to its explicit recipient", async () => {
    const ports = createMaterializationPorts();
    await createFinanceAutoEntryRule(
      financeAutoEntryContext(["finance.auto_entries.manage"]),
      {
        calculation: { amountCents: 1_000, kind: "fixed" },
        event: "vehicle_sale_closed",
        outputType: "commission",
        recipient: { kind: "fixed_user", userId: fixedRecipientId },
        timing: { kind: "same_day" },
      },
      ports,
    );

    const result = await materializeFinanceAutoEntries(
      financeAutoEntryContext(["sale.close"]),
      {
        basisCents: {},
        event: "vehicle_sale_closed",
        occurredAt: new Date("2026-02-01T12:00:00.000Z"),
        sellerUserId: sellerId,
        sourceId: saleId,
        sourceRevision: 1,
      },
      ports,
    );
    expect(result[0]?.entry.entry.sellerUserId).toBe(fixedRecipientId);
  });

  it("rejects an event seller without active membership in the store", async () => {
    const ports = createMaterializationPorts();
    ports.financeAutoEntryRepository.inactiveStoreMemberUserIds.add(sellerId);

    await expect(
      materializeFinanceAutoEntries(
        financeAutoEntryContext(["sale.close"]),
        {
          basisCents: { commission: 1_000 },
          event: "vehicle_sale_closed",
          occurredAt: new Date("2026-02-01T12:00:00.000Z"),
          sellerUserId: sellerId,
          sourceId: saleId,
          sourceRevision: 1,
        },
        ports,
      ),
    ).rejects.toThrow("must have an active membership in the current store");
  });

  it("rejects a persisted rule with an incompatible event basis", () => {
    const rule: FinanceAutoEntryRule = {
      calculation: {
        basis: "financing",
        basisPoints: 100,
        kind: "percentage",
      },
      category: null,
      conditions: {},
      createdAt: new Date("2026-01-01T00:00:00.000Z"),
      event: "vehicle_sale_closed",
      family: null,
      id: "rule_drift",
      metadata: {},
      name: null,
      outputType: "commission",
      priority: 0,
      recipient: { kind: "event_seller" },
      resolution: "additive",
      ruleKey: null,
      sellerUserId: null,
      status: "active",
      storeId: "store_1",
      tenantId: "tenant_1",
      timing: { kind: "same_day" },
      updatedAt: new Date("2026-01-01T00:00:00.000Z"),
    };

    expect(() =>
      calculateFinanceAutoEntryAmount(rule, { sale: 100_000 }),
    ).toThrow("basis incompatible with vehicle_sale_closed");
  });
});
