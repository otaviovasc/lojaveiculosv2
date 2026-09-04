// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
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
    isRefreshing,
    onApplyPeriod,
    onEndDateChange,
    onStartDateChange,
  }: {
    canViewAnalytics: boolean;
    isRefreshing: boolean;
    onApplyPeriod: () => void;
    onEndDateChange: (date: Date) => void;
    onStartDateChange: (date: Date) => void;
  }) => (
    <div data-testid="dashboard-toolbar">
      {canViewAnalytics ? "analytics-enabled" : "analytics-disabled"}
      {isRefreshing ? "refreshing" : "idle"}
      <button onClick={() => onStartDateChange(new Date(2026, 6, 1))}>
        Alterar início
      </button>
      <button onClick={() => onEndDateChange(new Date(2026, 6, 31))}>
        Alterar fim
      </button>
      <button onClick={onApplyPeriod}>Aplicar período</button>
    </div>
  ),
}));

vi.mock("./DashboardHomeKpis", () => ({
  DashboardHomeKpis: ({
    canViewAnalytics,
    onNavigate,
    stats,
  }: {
    canViewAnalytics: boolean;
    onNavigate: (moduleId: "reports") => void;
    stats: Array<{ label: string; value: string }>;
  }) => (
    <ul data-testid="dashboard-kpis">
      {stats.map((stat) => (
        <li key={stat.label}>
          {stat.label}: {stat.value}
          {canViewAnalytics ? (
            <button onClick={() => onNavigate("reports")}>
              Abrir relatório
            </button>
          ) : null}
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

  it("waits for an explicit apply before requesting the edited period", async () => {
    const getDashboard = vi.fn(async () => createDashboard());
    const api: AnalyticsApi = {
      getDashboard,
      getHomeDashboard: vi.fn(async () => createHomeDashboard()),
    };

    render(<DashboardHome api={api} canViewAnalytics onNavigate={vi.fn()} />);

    await waitFor(() => expect(getDashboard).toHaveBeenCalledOnce());
    fireEvent.click(screen.getByRole("button", { name: "Alterar início" }));
    fireEvent.click(screen.getByRole("button", { name: "Alterar fim" }));
    expect(getDashboard).toHaveBeenCalledOnce();

    fireEvent.click(screen.getByRole("button", { name: "Aplicar período" }));

    await waitFor(() => expect(getDashboard).toHaveBeenCalledTimes(2));
    expect(getDashboard).toHaveBeenLastCalledWith({
      from: "2026-07-01",
      to: "2026-07-31",
    });
  });

  it("preserves the last analytics result and warns inline when refresh fails", async () => {
    const getDashboard = vi
      .fn<AnalyticsApi["getDashboard"]>()
      .mockResolvedValueOnce(createDashboard())
      .mockRejectedValueOnce(new Error("analytics offline"));
    const api: AnalyticsApi = {
      getDashboard,
      getHomeDashboard: vi.fn(async () => createHomeDashboard()),
    };

    render(<DashboardHome api={api} canViewAnalytics onNavigate={vi.fn()} />);

    expect(
      await screen.findByText(/Faturamento: R\$\s*240\.000/),
    ).toBeVisible();
    fireEvent.click(screen.getByRole("button", { name: "Aplicar período" }));

    expect(
      await screen.findByText("Não foi possível atualizar os indicadores"),
    ).toBeVisible();
    expect(screen.getByText(/Faturamento: R\$\s*240\.000/)).toBeVisible();
    expect(screen.getByTestId("dashboard-main-panels")).toBeVisible();
    expect(
      screen.getByRole("button", { name: "Tentar novamente" }),
    ).toBeVisible();
  });

  it("ignores a stale analytics response after a newer refresh succeeds", async () => {
    const staleRequest = createDeferred<AnalyticsDashboard>();
    const getDashboard = vi
      .fn<AnalyticsApi["getDashboard"]>()
      .mockResolvedValueOnce(createDashboard())
      .mockImplementationOnce(() => staleRequest.promise)
      .mockResolvedValueOnce(createDashboard(99900000));
    const api: AnalyticsApi = {
      getDashboard,
      getHomeDashboard: vi.fn(async () => createHomeDashboard()),
    };

    render(<DashboardHome api={api} canViewAnalytics onNavigate={vi.fn()} />);

    expect(
      await screen.findByText(/Faturamento: R\$\s*240\.000/),
    ).toBeVisible();
    const applyPeriod = screen.getByRole("button", {
      name: "Aplicar período",
    });
    fireEvent.click(applyPeriod);
    fireEvent.click(applyPeriod);

    expect(
      await screen.findByText(/Faturamento: R\$\s*999\.000/),
    ).toBeVisible();
    await act(async () => {
      staleRequest.resolve(createDashboard(50000000));
      await staleRequest.promise;
    });
    expect(screen.getByText(/Faturamento: R\$\s*999\.000/)).toBeVisible();
    expect(
      screen.queryByText(/Faturamento: R\$\s*500\.000/),
    ).not.toBeInTheDocument();
  });

  it("opens detailed reports from an enabled KPI action", async () => {
    const onNavigate = vi.fn();
    const api: AnalyticsApi = {
      getDashboard: vi.fn(async () => createDashboard()),
      getHomeDashboard: vi.fn(async () => createHomeDashboard()),
    };

    render(
      <DashboardHome api={api} canViewAnalytics onNavigate={onNavigate} />,
    );

    const reportActions = await screen.findAllByRole("button", {
      name: "Abrir relatório",
    });
    fireEvent.click(reportActions[0]!);
    expect(onNavigate).toHaveBeenCalledWith("reports");
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

function createDashboard(closedSalesCents = 24000000): AnalyticsDashboard {
  return {
    financialAvailability: { status: "available" },
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
      closedSalesCents,
      openReceivablesCents: 100000,
      paidReceiptsCents: 0,
    },
    sales: {
      avgTicketCents: Math.round(closedSalesCents / 2),
      closedCount: 2,
    },
    storeId: "store_1",
    tenantId: "tenant_1",
  };
}
