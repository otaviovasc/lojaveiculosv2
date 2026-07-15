// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";
import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { CommissionSummaryCards } from "./CommissionSummaryCards";

describe("CommissionSummaryCards", () => {
  it("shows sale value and reconciliation alongside commission totals", () => {
    const { container } = render(
      <CommissionSummaryCards
        summary={{
          count: 4,
          paidCents: 2500,
          pendingCents: 15000,
          reconciliationCount: 1,
          salesCount: 2,
          salesValueCents: 15000000,
          sellersWithPending: 2,
          totalCents: 17500,
        }}
      />,
    );

    const salesCard = screen.getByText("Vendas no período").closest("section");
    expect(salesCard).not.toBeNull();
    expect(within(salesCard!).getByText("2")).toBeVisible();
    expect(salesCard).toHaveClass(
      "feature-stat-card--tinted",
      "feature-stat-card--violet",
    );

    const cards = Array.from(container.querySelectorAll("section > section"));
    expect(cards).toHaveLength(6);
    expect(cards.map((card) => card.className)).toEqual(
      expect.arrayContaining([
        expect.stringContaining("feature-stat-card--warning"),
        expect.stringContaining("feature-stat-card--green"),
        expect.stringContaining("feature-stat-card--accent"),
        expect.stringContaining("feature-stat-card--blue"),
        expect.stringContaining("feature-stat-card--violet"),
      ]),
    );
    expect(container.querySelectorAll("section > section > svg")).toHaveLength(
      6,
    );
  });
});
