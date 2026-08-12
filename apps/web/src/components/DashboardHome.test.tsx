// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { act, cleanup, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { AnalyticsApi } from "../features/analytics/apiClient";
import type {
  AnalyticsDashboard,
  HomeDashboard,
} from "../features/analytics/types";
import { AppApiError } from "../lib/apiErrors";
import { DashboardHome } from "./DashboardHome";

vi.mock("./DashboardHomeToolbar", () => ({
  DashboardHomeToolbar: ({
    canViewAnalytics,
  }: {
    canViewAnalytics: boolean;
  }) => (
    <div data-testid="dashboard-toolbar">
      {canViewAnalytics ? "analytics-enabled" : "analytics-disabled"}
    </div>
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
  DashboardHomeMainPanels: () => <div data-testid="dashboard-main-panels" />,
}));

vi.mock("./DashboardHomeSidebarPanel", () => ({
  DashboardHomeSidebarPanel: () => <div data-testid="dashboard-sidebar" />,
}));

describe("DashboardHome", () => {
  afterEach(cleanup);

  it("keeps fallback analytics cards out of the initial loading paint", async () => {
    const deferred = createDeferred<AnalyticsDashboard>();
    const api: AnalyticsApi = {
      getDashboard: vi.fn(() => deferred.promise),
      getHomeDashboard: vi.fn(async () => createHomeDashboard()),
    };

    render(<DashboardHome api={api} canViewAnalytics onNavigate={vi.fn()} />);

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
    expect(screen.getByTestId("dashboard-main-panels")).toBeInTheDocument();
  });

  it("keeps the core dashboard visible when analytics is forbidden", async () => {
    const api: AnalyticsApi = {
      getDashboard: vi.fn(() =>
        Promise.reject(
          new AppApiError({
            code: "AUTHORIZATION_DENIED",
            message: "Missing permission analytics.read.",
            requestId: "req_dashboard",
            status: 403,
          }),
        ),
      ),
      getHomeDashboard: vi.fn(async () => createHomeDashboard()),
    };

    render(<DashboardHome api={api} canViewAnalytics onNavigate={vi.fn()} />);

    expect(await screen.findByTestId("dashboard-main-panels")).toBeVisible();
    expect(
      screen.queryByRole("status", { name: "Carregando dashboard" }),
    ).not.toBeInTheDocument();
    expect(screen.queryByText("Missing permission")).not.toBeInTheDocument();
    expect(screen.getByTestId("dashboard-kpis")).toHaveTextContent("—");
  });

  it("does not request analytics and renders protected values as placeholders", async () => {
    const api: AnalyticsApi = {
      getDashboard: vi.fn(async () => createDashboard()),
      getHomeDashboard: vi.fn(async () => createHomeDashboard()),
    };

    render(
      <DashboardHome api={api} canViewAnalytics={false} onNavigate={vi.fn()} />,
    );

    expect(await screen.findByTestId("dashboard-main-panels")).toBeVisible();
    expect(api.getHomeDashboard).toHaveBeenCalledOnce();
    expect(api.getDashboard).not.toHaveBeenCalled();
    expect(screen.getByTestId("dashboard-kpis")).toHaveTextContent(
      "Faturamento: —",
    );
    expect(screen.getByTestId("dashboard-toolbar")).toHaveTextContent(
      "analytics-disabled",
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

function createHomeDashboard(): HomeDashboard {
  return {
    generatedAt: "2026-06-22T17:00:00.000Z",
    inventory: {
      availableListings: 4,
      totalListings: 7,
    },
    leadSummary: { activeLeads: 6 },
    storeId: "store_1",
    tenantId: "tenant_1",
  };
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
