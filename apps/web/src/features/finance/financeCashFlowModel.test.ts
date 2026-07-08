import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  entrySourceKey,
  matchesFinanceDateFilter,
  summarizeCashFlow,
  urgentFinanceEntries,
} from "./financeCashFlowModel";
import type { FinanceEntry } from "./types";

describe("finance cash flow model", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-06-22T12:00:00"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("counts expenses and commissions as outflow for planned and realized cash", () => {
    const summary = summarizeCashFlow([
      entry("revenue", "revenue", "paid", 200000),
      entry("expense", "expense", "paid", 40000),
      entry("commission", "commission", "pending", 10000),
    ]);

    expect(summary.revenueCents).toBe(200000);
    expect(summary.outflowCents).toBe(50000);
    expect(summary.plannedBalanceCents).toBe(150000);
    expect(summary.realizedBalanceCents).toBe(160000);
    expect(summary.pendingCents).toBe(10000);
  });

  it("classifies linked vehicle entries as vehicle source", () => {
    expect(
      entrySourceKey({
        ...entry("cost", "expense", "paid", 30000),
        links: [
          {
            entryId: "cost",
            targetId: "unit_1",
            targetType: "vehicle_unit",
          },
        ],
      }),
    ).toBe("vehicle");
  });

  it("matches custom date ranges and urgent pending outflows", () => {
    const entries = [
      entry("overdue", "expense", "pending", 10000, "2026-06-20"),
      entry("soon", "expense", "pending", 15000, "2026-06-25"),
      entry("later", "expense", "pending", 20000, "2026-08-10"),
    ];

    expect(
      entries
        .filter((item) =>
          matchesFinanceDateFilter(item, {
            dateFrom: "2026-06-01",
            datePreset: "custom",
            dateTo: "2026-06-30",
          }),
        )
        .map((item) => item.id),
    ).toEqual(["overdue", "soon"]);
    expect(urgentFinanceEntries(entries).top.map((item) => item.id)).toEqual([
      "overdue",
      "soon",
    ]);
  });
});

function entry(
  id: string,
  type: FinanceEntry["type"],
  status: FinanceEntry["status"],
  amountCents: number,
  dueAt = "2026-06-25",
): FinanceEntry {
  return {
    amountCents,
    category: "Operacional",
    dueAt: `${dueAt}T15:00:00.000Z`,
    id,
    name: id,
    paidAt: status === "paid" ? `${dueAt}T15:00:00.000Z` : null,
    sellerUserId: null,
    status,
    type,
  };
}
