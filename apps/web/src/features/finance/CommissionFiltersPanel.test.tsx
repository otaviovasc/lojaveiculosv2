// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { CommissionFiltersPanel } from "./CommissionFiltersPanel";
import { initialCommissionFilters } from "./commissionWorkspaceModel";

describe("CommissionFiltersPanel", () => {
  afterEach(() => cleanup());

  it("keeps the date range and commission filters on one desktop row", () => {
    const { container } = render(
      <CommissionFiltersPanel
        filters={initialCommissionFilters()}
        hasFilters={false}
        onChange={vi.fn()}
        onClear={vi.fn()}
        originOptions={[{ label: "Venda", value: "sale" }]}
        sellerOptions={[{ label: "Ana", value: "seller-1" }]}
      />,
    );

    const filterGrid = container.querySelector<HTMLElement>(
      ".commission-filter-grid",
    );
    const dateRange = container.querySelector<HTMLElement>(
      ".datepicker-range-picker",
    );

    expect(filterGrid).toHaveClass("xl:grid-cols-4");
    expect(dateRange).not.toBeNull();
    expect(within(dateRange!).getByText("De:")).toBeVisible();
    expect(within(dateRange!).getByText("Até:")).toBeVisible();
    expect(screen.queryByText("Este mês")).not.toBeInTheDocument();
    expect(screen.getByText("Vendedor")).toBeVisible();
    expect(screen.getByText("Status")).toBeVisible();
    expect(screen.getByText("Origem")).toBeVisible();
  });
});
