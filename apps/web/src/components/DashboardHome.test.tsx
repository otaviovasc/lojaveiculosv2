// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { act, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { AnalyticsApi } from "../features/analytics/apiClient";
import type { AnalyticsDashboard } from "../features/analytics/types";
import { DashboardHome } from "./DashboardHome";

vi.mock("./DashboardHomeToolbar", () => ({
  DashboardHomeToolbar: ({ dashboard }: { dashboard: AnalyticsDashboard }) => (
    <div data-testid="dashboard-toolbar">{dashboard.storeId}</div>
  ),
}));

vi.mock("./DashboardHomeKpis", () => ({
  DashboardHomeKpis: ({
    stats,
  }: {
    stats: Array<{ label: string; value: string }>;
  }) => (
    <ul data-testid="dashboard-kpis">
      {stats.map((stat) => (
        <li key={stat.label}>
          {stat.label}: {stat.value}
        </li>
      ))}
    </ul>
  ),
}));

vi.mock("./DashboardHomeMainPanels", () => ({
  DashboardHomeMainPanels: ({
    dashboard,
  }: {
    dashboard: AnalyticsDashboard | null;
  }) => <div data-testid="dashboard-main-panels">{dashboard?.storeId}</div>,
}));

vi.mock("./DashboardHomeSidebarPanel", () => ({
  DashboardHomeSidebarPanel: () => <div data-testid="dashboard-sidebar" />,
}));

describe("DashboardHome", () => {
  it("keeps fallback analytics cards out of the initial loading paint", async () => {
    const deferred = createDeferred<AnalyticsDashboard>();
    const api: AnalyticsApi = {
      getDashboard: vi.fn(() => deferred.promise),
    };

    render(<DashboardHome api={api} onNavigate={vi.fn()} />);

    expect(
      screen.getByRole("status", { name: "Carregando dashboard" }),
    ).toBeInTheDocument();
    expect(screen.queryByTestId("dashboard-kpis")).not.toBeInTheDocument();

    await act(async () => {
      deferred.resolve(createDashboard());
      await deferred.promise;
    });

    await waitFor(() =>
      expect(
        screen.queryByRole("status", { name: "Carregando dashboard" }),
      ).not.toBeInTheDocument(),
    );
    expect(screen.getByTestId("dashboard-kpis")).toHaveTextContent(
      "Faturamento",
    );
    expect(screen.getByTestId("dashboard-kpis")).not.toHaveTextContent("R$ 0");
    expect(screen.getByTestId("dashboard-main-panels")).toHaveTextContent(
      "store_1",
    );
  });
});

function createDeferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, reject, resolve };
}

function createDashboard(): AnalyticsDashboard {
  return {
    generatedAt: "2026-06-22T17:00:00.000Z",
    inventory: {
      averagePriceCents: 12000000,
      availableListings: 4,
      reservedListings: 1,
      soldListings: 2,
      totalListings: 7,
    },
    kpis: [{ deltaLabel: "periodo atual", label: "GMV", value: "R$ 240.000" }],
    leadFunnel: [
      { count: 8, key: "new", label: "Novos" },
      { count: 2, key: "won", label: "Ganhos" },
    ],
    leadSources: [{ key: "whatsapp", label: "WhatsApp", value: 5 }],
    revenue: {
      closedSalesCents: 24000000,
      grossMarginCents: 0,
      openReceivablesCents: 100000,
      paidReceiptsCents: 0,
    },
    storeId: "store_1",
    tenantId: "tenant_1",
  };
}
