// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { ReportsApi } from "./apiClient";
import { ReportsModule } from "./ReportsModule";

vi.mock("../../components/ui/AnimatedContent", () => ({
  default: ({ children }: { children: unknown }) => children,
}));

vi.stubGlobal(
  "IntersectionObserver",
  class {
    disconnect() {}
    observe() {}
    unobserve() {}
  },
);

describe("ReportsModule", () => {
  afterEach(cleanup);

  it("renders a semantic heading and honest no-data states", async () => {
    render(<ReportsModule api={createApi()} />);

    expect(
      await screen.findByRole("heading", {
        level: 1,
        name: "Relatórios gerenciais",
      }),
    ).toBeVisible();
    expect(screen.getByText("Sem dados de funil")).toBeVisible();
    expect(screen.getByText("Sem origens registradas")).toBeVisible();
    expect(screen.getAllByText("R$ 0,00").length).toBeGreaterThan(0);
    expect(
      screen.queryByText(/R\$ 0,00 período atual/),
    ).not.toBeInTheDocument();
    expect(screen.getByText(/Vendas fechadas · período atual/)).toBeVisible();
    expect(
      screen.getByRole("toolbar", { name: "Ações dos relatórios" }),
    ).toBeVisible();
  });

  it("keeps large financial values complete and uses operational tones", async () => {
    render(
      <ReportsModule
        api={createApi({
          closedSalesCents: 987_654_321,
          grossMarginCents: 876_543_210,
          openReceivablesCents: 765_432_109,
          paidReceiptsCents: 654_321_098,
        })}
      />,
    );

    const closedSales = await screen.findByText(/9\.876\.543,21/);
    const openReceivables = screen.getByText(/7\.654\.321,09/);
    const paidReceipts = screen.getByText(/6\.543\.210,98/);

    expect(closedSales).toHaveTextContent("R$ 9.876.543,21");
    expect(openReceivables).toHaveTextContent("R$ 7.654.321,09");
    expect(paidReceipts).toHaveTextContent("R$ 6.543.210,98");
    expect(closedSales.closest(".feature-kpi-card")).toHaveClass(
      "kpi-gradient-green",
    );
    expect(openReceivables.closest(".feature-kpi-card")).toHaveClass(
      "kpi-gradient-violet",
    );
    expect(paidReceipts.closest(".feature-kpi-card")).toHaveClass(
      "kpi-gradient-green",
    );
  });
});

function createApi(
  revenue: Partial<{
    closedSalesCents: number;
    grossMarginCents: number;
    openReceivablesCents: number;
    paidReceiptsCents: number;
  }> = {},
): ReportsApi {
  return {
    getDashboard: vi.fn(async () => ({
      generatedAt: "2026-07-11T12:00:00.000Z",
      inventory: {
        averagePriceCents: 0,
        availableListings: 0,
        reservedListings: 0,
        soldListings: 0,
        totalListings: 0,
      },
      kpis: [
        {
          deltaLabel: "período atual",
          label: "GMV fechado",
          value: "R$ 0,00",
        },
      ],
      leadFunnel: [],
      leadSources: [],
      revenue: {
        closedSalesCents: 0,
        grossMarginCents: 0,
        openReceivablesCents: 0,
        paidReceiptsCents: 0,
        ...revenue,
      },
    })),
  };
}
