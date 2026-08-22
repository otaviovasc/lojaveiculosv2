import { describe, expect, it } from "vitest";
import type { InventoryCost } from "../model/operationTypes";
import {
  costToCashFlowItem,
  sumCosts,
  sumOrNull,
} from "./InventoryDetailFinanceiroTabSupport";

describe("vehicle finance cost totals", () => {
  it("removes voided costs from margin and cash totals without hiding history", () => {
    const active = cost({ id: "cost_active", amountCents: 10000 });
    const voided = cost({
      id: "cost_voided",
      amountCents: 5000,
      status: "voided",
      voidReason: "Duplicado",
    });

    expect(sumCosts([active, voided])).toBe(10000);
    expect(sumOrNull([voided])).toBeNull();
    expect(costToCashFlowItem(voided)).toMatchObject({
      status: "Estornado",
      value: -5000,
    });
  });
});

function cost(overrides: Partial<InventoryCost>): InventoryCost {
  return {
    amountCents: 10000,
    costDate: "2026-02-03T12:00:00.000Z",
    createdAt: "2026-02-03T12:00:00.000Z",
    description: "Pintura",
    id: "cost_1",
    kind: "repair",
    status: "active",
    storeId: "store_1",
    tenantId: "tenant_1",
    unitId: "unit_1",
    updatedAt: "2026-02-03T12:00:00.000Z",
    voidedAt: null,
    voidReason: null,
    ...overrides,
  };
}
