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
    expect(workspace.sellers.map((seller) => seller.salesCount)).toEqual([
      0, 0,
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

  it("keeps sale ownership separate from additional commission recipients", () => {
    const workspace = buildCommissionWorkspace(
      [
        entry(
          "sale-a-standard",
          "seller-a",
          "sales_commission",
          "pending",
          10000,
          "sale-a",
        ),
        entry(
          "sale-a-extra",
          "seller-b",
          "extra_commission",
          "pending",
          2500,
          "sale-a",
        ),
        {
          ...entry("sale-b", "seller-a", "sales_commission", "paid", 5000),
          links: [
            {
              entryId: "sale-b",
              targetId: "sale-b",
              targetType: "sale",
            },
          ],
        },
        entry("bonus", "seller-a", "manual_bonus", "paid", 1000),
        {
          ...entry(
            "sale-outside-period",
            "seller-a",
            "sales_commission",
            "paid",
            3000,
            "sale-outside-period",
          ),
          createdAt: "2026-05-31T15:00:00.000Z",
        },
      ],
      juneCommissionFilters(),
    );

    expect(workspace.summary.salesCount).toBe(2);
    expect(
      workspace.sellers.map(({ salesCount, sellerId }) => ({
        salesCount,
        sellerId,
      })),
    ).toEqual([
      { salesCount: 2, sellerId: "seller-a" },
      { salesCount: 0, sellerId: "seller-b" },
    ]);
    expect(workspace.sellers[1]?.sales[0]?.entries).toHaveLength(1);
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

  it("keeps closed sales without commissions visible and totals sold value", () => {
    const commission = entry(
      "sale-a-commission",
      "seller-a",
      "sales_commission",
      "pending",
      10000,
      "sale-a",
    );
    const workspace = buildCommissionWorkspace(
      {
        adjustments: [],
        generatedAt: "2026-06-30T12:00:00.000Z",
        reconciliation: [
          {
            code: "missing_commission",
            entryId: null,
            saleId: "sale-b",
            severity: "critical",
          },
        ],
        sales: [
          workspaceSale("sale-a", "seller-a", 9_000_000, [commission]),
          workspaceSale("sale-b", "seller-b", 7_500_000, []),
        ],
        sellerNames: {
          "seller-a": "Vendedor A",
          "seller-b": "Vendedor B",
        },
      },
      juneCommissionFilters(),
    );

    expect(workspace.summary).toMatchObject({
      reconciliationCount: 1,
      salesCount: 2,
      salesValueCents: 16_500_000,
    });
    expect(workspace.sellers.map((seller) => seller.sellerName)).toEqual([
      "Vendedor A",
      "Vendedor B",
    ]);
    expect(workspace.sellers[1]?.sales[0]?.entries).toEqual([]);
  });

  it("keeps critical reconciliation entries visible but out of settlement totals", () => {
    const unsafeEntry = entry(
      "cancelled-sale-commission",
      "seller-a",
      "sales_commission",
      "pending",
      10000,
      "sale-cancelled",
    );
    const workspace = buildCommissionWorkspace(
      {
        adjustments: [unsafeEntry],
        generatedAt: "2026-06-30T12:00:00.000Z",
        reconciliation: [
          {
            code: "cancelled_sale",
            entryId: null,
            saleId: "sale-cancelled",
            severity: "critical",
          },
        ],
        sales: [],
        sellerNames: { "seller-a": "Vendedor A" },
      },
      juneCommissionFilters(),
    );

    expect(workspace.filteredEntries).toEqual([unsafeEntry]);
    expect(workspace.summary.pendingCents).toBe(0);
    expect(workspace.sellers[0]).toMatchObject({
      blockedCount: 1,
      pendingCents: 0,
    });
    expect(
      pendingSellerEntries(workspace.sellers[0]!, juneCommissionFilters()),
    ).toEqual([]);
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
  saleId?: string,
): FinanceEntry {
  return {
    amountCents,
    category,
    dueAt: "2026-06-25T15:00:00.000Z",
    id,
    metadata: {
      ...(saleId ? { saleId } : {}),
      sellerName: `Seller ${sellerUserId}`,
    },
    name: `Comissao ${id}`,
    paidAt: status === "paid" ? "2026-06-26T15:00:00.000Z" : null,
    sellerUserId,
    status,
    type: "commission",
  };
}

function workspaceSale(
  id: string,
  sellerUserId: string,
  salePriceCents: number,
  entries: FinanceEntry[],
) {
  return {
    closedAt: "2026-06-20T15:00:00.000Z",
    createdAt: "2026-06-01T15:00:00.000Z",
    entries,
    id,
    isCurrentRevision: true,
    listingSnapshot: { title: `Veículo ${id}` },
    salePriceCents,
    sellerUserId,
    standardCommissionEnabled: true,
    status: "closed" as const,
    unitId: `unit-${id}`,
    updatedAt: "2026-06-20T15:00:00.000Z",
  };
}
