import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  buildCommissionWorkspace,
  initialCommissionFilters,
  pendingSellerEntries,
} from "./commissionWorkspaceModel";
import type { FinanceEntry } from "./types";

describe("commission workspace model", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-06-22T12:00:00.000Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("groups commission entries by seller and keeps paid versus pending visible", () => {
    const filters = juneCommissionFilters();
    const workspace = buildCommissionWorkspace(
      [
        entry("1", "seller-a", "sales_commission", "pending", 10000),
        entry("2", "seller-a", "manual_bonus", "paid", 2500),
        entry("3", "seller-b", "sales_commission", "pending", 5000),
      ],
      filters,
    );

    expect(workspace.summary).toMatchObject({
      paidCents: 2500,
      pendingCents: 15000,
      sellersWithPending: 2,
      totalCents: 17500,
    });
    expect(workspace.sellers.map((seller) => seller.sellerId)).toEqual([
      "seller-a",
      "seller-b",
    ]);
    expect(
      workspace.sellers[0]?.origins.map((origin) => origin.origin),
    ).toEqual(["sales_commission", "manual_bonus"]);
  });

  it("filters seller payable entries by active origin", () => {
    const filters = {
      ...juneCommissionFilters(),
      origin: "manual_bonus",
    };
    const workspace = buildCommissionWorkspace(
      [
        entry("sale", "seller-a", "sales_commission", "pending", 10000),
        entry("bonus", "seller-a", "manual_bonus", "pending", 2500),
      ],
      filters,
    );

    expect(workspace.summary.pendingCents).toBe(2500);
    expect(
      pendingSellerEntries(workspace.sellers[0]!, filters).map(
        (item) => item.id,
      ),
    ).toEqual(["bonus"]);
  });

  it("uses creation date instead of due date for the closing period", () => {
    const filters = {
      ...initialCommissionFilters(),
      from: "2026-06-01",
      period: "custom" as const,
      to: "2026-06-30",
    };

    const workspace = buildCommissionWorkspace(
      [
        {
          ...entry(
            "created-in-june",
            "seller-a",
            "sales_commission",
            "pending",
            10000,
          ),
          createdAt: "2026-06-20T15:00:00.000Z",
          dueAt: "2026-07-05T15:00:00.000Z",
        },
        {
          ...entry(
            "created-in-may",
            "seller-a",
            "sales_commission",
            "pending",
            2500,
          ),
          createdAt: "2026-05-31T15:00:00.000Z",
          dueAt: "2026-06-05T15:00:00.000Z",
        },
      ],
      filters,
    );

    expect(workspace.filteredEntries.map((item) => item.id)).toEqual([
      "created-in-june",
    ]);
  });
});

function juneCommissionFilters() {
  return {
    ...initialCommissionFilters(),
    from: "2026-06-01",
    period: "custom" as const,
    to: "2026-06-30",
  };
}

function entry(
  id: string,
  sellerUserId: string,
  category: string,
  status: FinanceEntry["status"],
  amountCents: number,
): FinanceEntry {
  return {
    amountCents,
    category,
    dueAt: "2026-06-25T15:00:00.000Z",
    id,
    metadata: { sellerName: `Seller ${sellerUserId}` },
    name: `Comissao ${id}`,
    paidAt: status === "paid" ? "2026-06-26T15:00:00.000Z" : null,
    sellerUserId,
    status,
    type: "commission",
  };
}
