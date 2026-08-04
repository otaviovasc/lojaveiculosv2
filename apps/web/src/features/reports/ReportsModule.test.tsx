// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { ReportsApi } from "./apiClient";
import { ReportsModule } from "./ReportsModule";
import type { ReportsDashboard } from "./types";

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

  it("renders all sections of the single-page report", async () => {
    render(<ReportsModule api={createApi()} />);

    expect(
      await screen.findByRole("heading", { level: 1, name: "Relatórios" }),
    ).toBeVisible();
    expect(
      screen.getByRole("toolbar", { name: "Ações dos relatórios" }),
    ).toBeVisible();
    expect(screen.getByText(/Atualizado em/)).toBeVisible();

    expect(screen.getByRole("heading", { name: "Financeiro" })).toBeVisible();
    expect(screen.getByRole("heading", { name: "Estoque" })).toBeVisible();
    expect(
      screen.getByRole("heading", { name: "Funil comercial" }),
    ).toBeVisible();
    expect(
      screen.getByRole("heading", { name: "Origem dos leads" }),
    ).toBeVisible();
    expect(
      screen.getByRole("heading", { name: "Precisa de atenção" }),
    ).toBeVisible();

    expect(screen.getByText("Receita")).toBeVisible();
    expect(screen.getByText("Margem bruta")).toBeVisible();
    expect(screen.getByText("Leads ativos")).toBeVisible();
    expect(screen.getByText("Ticket médio")).toBeVisible();
    expect(screen.getByText(/12 de 40/)).toBeVisible();
    expect(screen.getByText("0–30 dias")).toBeVisible();
    expect(screen.getByText("Mais de 90 dias")).toBeVisible();
  });

  it("formats money values in pt-BR from cents", async () => {
    render(<ReportsModule api={createApi()} />);

    expect(await screen.findAllByText("R$ 4.500,00")).not.toHaveLength(0);
    expect(screen.getAllByText("R$ 1.250,00").length).toBeGreaterThan(0);
  });

  it("shows attention items and Tudo em dia when nothing is pending", async () => {
    render(<ReportsModule api={createApi()} />);
    expect(await screen.findByText(/2 recebíveis vencidos/)).toBeVisible();
    expect(screen.getByText(/1 checklist pendente/)).toBeVisible();

    cleanup();

    render(
      <ReportsModule
        api={createApi({
          attention: {
            overdueReceivablesCents: 0,
            overdueReceivablesCount: 0,
            pendingChecklistsCount: 0,
          },
        })}
      />,
    );
    expect(await screen.findByText("Tudo em dia")).toBeVisible();
  });

  it("shows empty states when funnel and sources are empty", async () => {
    render(
      <ReportsModule api={createApi({ leadFunnel: [], leadSources: [] })} />,
    );

    expect(await screen.findByText("Sem dados de funil")).toBeVisible();
    expect(screen.getByText("Sem origens registradas")).toBeVisible();
  });

  it("refetches with the new period when the preset changes", async () => {
    const user = userEvent.setup();
    const api = createApi();
    render(<ReportsModule api={api} />);

    await screen.findByRole("heading", { level: 1, name: "Relatórios" });
    expect(api.getDashboard).toHaveBeenCalledTimes(1);

    await user.click(
      screen.getByRole("button", { name: "Período dos relatórios" }),
    );
    await user.click(screen.getByRole("option", { name: "90 dias" }));

    await waitFor(() => expect(api.getDashboard).toHaveBeenCalledTimes(2));
    const period = vi.mocked(api.getDashboard).mock.calls[1]?.[0];
    expect(period?.from).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(period?.to).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    const from = new Date(`${period?.from}T00:00:00`);
    const to = new Date(`${period?.to}T00:00:00`);
    expect(to.getTime() - from.getTime()).toBe(89 * 24 * 60 * 60 * 1000);
  });

  it("shows the error state and recovers via retry", async () => {
    const user = userEvent.setup();
    const getDashboard = vi
      .fn<ReportsApi["getDashboard"]>()
      .mockRejectedValueOnce(new Error("falha"))
      .mockResolvedValue(createDashboard());
    render(<ReportsModule api={{ getDashboard }} />);

    expect(await screen.findByText("Relatórios indisponíveis")).toBeVisible();

    await user.click(
      screen.getByRole("button", { name: "Tentar carregar novamente" }),
    );
    expect(
      await screen.findByRole("heading", { name: "Financeiro" }),
    ).toBeVisible();
  });
});

function createApi(overrides: Partial<ReportsDashboard> = {}): ReportsApi {
  return {
    getDashboard: vi.fn(async () => createDashboard(overrides)),
  };
}

function createDashboard(
  overrides: Partial<ReportsDashboard> = {},
): ReportsDashboard {
  return {
    generatedAt: "2026-07-11T12:00:00.000Z",
    period: { from: "2026-06-11", to: "2026-07-11" },
    kpis: [],
    leadFunnel: [
      { count: 10, key: "new", label: "new" },
      { count: 6, key: "negotiating", label: "negotiating" },
      { count: 2, key: "won", label: "won" },
      { count: 1, key: "lost", label: "lost" },
    ],
    leadSources: [
      { key: "olx", label: "olx", value: 8 },
      { key: "whatsapp", label: "whatsapp", value: 5 },
    ],
    revenue: {
      closedSalesCents: 450_000,
      openReceivablesCents: 125_000,
      paidReceiptsCents: 320_000,
    },
    sales: {
      closedCount: 3,
      revenueCents: 450_000,
      avgTicketCents: 150_000,
      grossMarginCents: 90_000,
    },
    inventory: {
      averagePriceCents: 8_500_000,
      availableListings: 12,
      reservedListings: 2,
      soldListings: 3,
      totalListings: 40,
      ageBuckets: {
        days0to30: 5,
        days31to60: 4,
        days61to90: 2,
        over90: 1,
      },
    },
    attention: {
      overdueReceivablesCents: 42_000,
      overdueReceivablesCount: 2,
      pendingChecklistsCount: 1,
    },
    ...overrides,
  };
}
