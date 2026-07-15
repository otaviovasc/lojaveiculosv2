// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";
import { render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { CommissionSellerList } from "./CommissionSellerList";
import {
  initialCommissionFilters,
  type CommissionSellerGroup,
} from "./commissionWorkspaceModel";

describe("CommissionSellerList", () => {
  it("shows each seller sales count and sold value", () => {
    const seller: CommissionSellerGroup = {
      adjustments: [],
      blockedCount: 0,
      count: 3,
      entries: [],
      origins: [],
      paidCents: 2500,
      pendingCents: 15000,
      rank: 1,
      sales: [],
      salesCount: 2,
      salesValueCents: 15000000,
      sellerId: "seller-a",
      sellerName: "Vendedor A",
      totalCents: 17500,
    };
    const { container } = render(
      <CommissionSellerList
        canCreate={false}
        canUpdate={false}
        filters={initialCommissionFilters()}
        isPayingSellerId={null}
        onCancel={vi.fn()}
        onEdit={vi.fn()}
        onOpenBonus={vi.fn()}
        onOpenPay={vi.fn()}
        onViewSale={vi.fn()}
        sellers={[seller]}
      />,
    );

    const salesCard = screen.getByText("Vendas").closest("section");
    expect(salesCard).not.toBeNull();
    expect(within(salesCard!).getByText("2")).toBeVisible();
    expect(salesCard).toHaveClass(
      "feature-stat-card--compact",
      "feature-stat-card--tinted",
      "feature-stat-card--violet",
    );

    const cards = Array.from(
      container.querySelectorAll(".commission-seller-card .feature-stat-card"),
    );
    expect(cards).toHaveLength(5);
    expect(cards.map((card) => card.className)).toEqual(
      expect.arrayContaining([
        expect.stringContaining("feature-stat-card--warning"),
        expect.stringContaining("feature-stat-card--green"),
        expect.stringContaining("feature-stat-card--accent"),
        expect.stringContaining("feature-stat-card--violet"),
        expect.stringContaining("feature-stat-card--blue"),
      ]),
    );
    expect(
      container.querySelectorAll(
        ".commission-seller-card .feature-stat-card > svg",
      ),
    ).toHaveLength(5);
  });
});
