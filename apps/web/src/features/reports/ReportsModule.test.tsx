// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ReportsApi } from "./apiClient";
import { ReportsModule } from "./ReportsModule";
import type { ReportsDashboard, ReportsPeriod } from "./types";

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
  beforeEach(() => window.history.replaceState(null, "", "/admin"));
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it("opens the owner summary with grouped report navigation and real ledger gaps", async () => {
    render(<ReportsModule api={createApi()} />);

    expect(
      await screen.findByRole("heading", { level: 1, name: "Relatórios" }),
    ).toBeVisible();
    expect(
      screen.getByRole("navigation", { name: "Categorias de relatórios" }),
    ).toBeVisible();
    expect(
      screen.getByRole("button", { name: "Visão do dono" }),
    ).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByText("Saldo realizado")).toBeVisible();
    expect(screen.getByText("Margem apurada")).toBeVisible();
    expect(
      screen.getByRole("heading", { name: "Vendas que precisam de atenção" }),
    ).toBeVisible();
    expect(screen.getByText("Aquisição pendente")).toBeVisible();
    expect(
      screen.getByRole("button", { name: "Baixar PDF executivo" }),
    ).toBeVisible();
    expect(
      screen.queryByText(/nenhum arquivo foi sintetizado/i),
    ).not.toBeInTheDocument();
  });

  it("keeps the selected report and search in the URL", async () => {
    const user = userEvent.setup();
    render(<ReportsModule api={createApi()} />);
    await screen.findByText("Saldo realizado");

    await user.click(screen.getByRole("tab", { name: "Vendidos" }));
    expect(
      await screen.findByRole("heading", { name: "Veículos vendidos" }),
    ).toBeVisible();
    expect(window.location.search).toContain("tab=sold");

    const search = screen.getByRole("textbox", {
      name: "Buscar veículo no relatório",
    });
    await user.type(search, "Civic");
    expect(screen.getByText("Honda Civic Touring")).toBeVisible();
    expect(screen.queryByText("Toyota Corolla XEi")).not.toBeInTheDocument();
    expect(window.location.search).toContain("q=Civic");
  });

  it("downloads the materialized executive PDF for the selected period", async () => {
    const user = userEvent.setup();
    const api = createApi();
    const createObjectUrl = vi.fn(() => "blob:executive-report");
    const revokeObjectUrl = vi.fn();
    Object.defineProperties(URL, {
      createObjectURL: { configurable: true, value: createObjectUrl },
      revokeObjectURL: { configurable: true, value: revokeObjectUrl },
    });
    vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});
    render(<ReportsModule api={api} />);
    await screen.findByText("Saldo realizado");

    await user.click(
      screen.getByRole("button", { name: "Baixar PDF executivo" }),
    );

    await waitFor(() =>
      expect(api.downloadExecutiveReport).toHaveBeenCalledTimes(1),
    );
    expect(vi.mocked(api.downloadExecutiveReport).mock.calls[0]?.[0]).toEqual(
      vi.mocked(api.getDashboard).mock.calls[0]?.[0],
    );
    expect(createObjectUrl).toHaveBeenCalledWith(expect.any(Blob));
  });

  it("restores a custom range from the URL", async () => {
    window.history.replaceState(
      null,
      "",
      "/admin?tab=finance&period=custom&from=2026-06-01&to=2026-06-20",
    );
    const api = createApi();
    render(<ReportsModule api={api} />);

    await screen.findByText("Entradas previstas");
    expect(api.getDashboard).toHaveBeenCalledWith({
      from: "2026-06-01",
      to: "2026-06-20",
    });
    expect(screen.getByText("01/06/2026 a 20/06/2026")).toBeVisible();
    expect(
      screen.getByRole("button", { name: /^Data inicial:/ }),
    ).toBeVisible();
    expect(screen.getByRole("button", { name: /^Data final:/ })).toBeVisible();
  });

  it("normalizes an impossible URL date before requesting analytics", async () => {
    window.history.replaceState(
      null,
      "",
      "/admin?tab=finance&period=custom&from=2026-02-01&to=2026-02-31",
    );
    const api = createApi();
    render(<ReportsModule api={api} />);

    await screen.findByText("Entradas previstas");
    const requested = vi.mocked(api.getDashboard).mock.calls[0]?.[0];
    expect(requested).toBeDefined();
    expect(requested).not.toEqual({ from: "2026-02-01", to: "2026-02-31" });
    expect(window.location.search).toContain("period=30d");
    expect(window.location.search).not.toContain("2026-02-31");
  });

  it("loads and labels the immediately previous period on demand", async () => {
    window.history.replaceState(
      null,
      "",
      "/admin?tab=finance&period=custom&from=2026-06-11&to=2026-06-20",
    );
    const user = userEvent.setup();
    const api = createApi();
    render(<ReportsModule api={api} />);
    await screen.findByText("Entradas previstas");

    await user.click(screen.getByRole("button", { name: "Comparar" }));

    await waitFor(() => expect(api.getDashboard).toHaveBeenCalledTimes(3));
    expect(api.getDashboard).toHaveBeenNthCalledWith(3, {
      from: "2026-06-01",
      to: "2026-06-10",
    });
    expect(
      screen.getByText(/Comparando 11\/06\/2026 a 20\/06\/2026/),
    ).toBeVisible();
    expect(await screen.findAllByText("Sem mudança")).not.toHaveLength(0);
    expect(window.location.search).toContain("compare=1");
  });

  it("shows CRM and document data, and tells the truth when marketing is unavailable", async () => {
    const user = userEvent.setup();
    render(<ReportsModule api={createApi()} />);
    await screen.findByText("Saldo realizado");

    await user.click(
      screen.getByRole("button", { name: "Financeiro e vendas" }),
    );
    await user.click(screen.getByRole("tab", { name: "CRM" }));
    expect(await screen.findByText("Leads criados")).toBeVisible();
    expect(
      screen.getByRole("heading", { name: "Etapas do funil" }),
    ).toBeVisible();

    await user.click(screen.getByRole("button", { name: "Canais e arquivos" }));
    expect(await screen.findByText("Documentos no período")).toBeVisible();
    expect(screen.getByText("Contrato de venda")).toBeVisible();

    await user.click(screen.getByRole("tab", { name: "Marketing" }));
    expect(await screen.findByText("Marketing indisponível")).toBeVisible();
    expect(
      screen.getByText(/não possui eventos persistidos de visitas e cliques/i),
    ).toBeVisible();
  });

  it("renders restricted report sections without leaking their values", async () => {
    window.history.replaceState(null, "", "/admin?tab=finance");
    render(
      <ReportsModule
        api={createApi({
          finance: {
            ...createDashboard().finance,
            availability: {
              reason: "Este perfil não possui a permissão finance.read.",
              status: "restricted",
            },
          },
        })}
      />,
    );

    expect(
      await screen.findByText("Relatório financeiro restrito"),
    ).toBeVisible();
    expect(screen.queryByText("Entradas realizadas")).not.toBeInTheDocument();
  });

  it("shows a truthful error state and retries the official query", async () => {
    const user = userEvent.setup();
    const getDashboard = vi
      .fn<ReportsApi["getDashboard"]>()
      .mockRejectedValueOnce(new Error("falha"))
      .mockResolvedValue(createDashboard());
    render(<ReportsModule api={{ ...createApi(), getDashboard }} />);

    expect(
      await screen.findByRole("heading", { name: "Relatórios indisponíveis" }),
    ).toBeVisible();
    expect(
      screen.getByText(/nenhum valor estimado foi exibido/i),
    ).toBeVisible();

    await user.click(
      screen.getByRole("button", { name: "Tentar carregar novamente" }),
    );
    expect(await screen.findByText("Saldo realizado")).toBeVisible();
    expect(getDashboard).toHaveBeenCalledTimes(2);
  });
});

function createApi(overrides: Partial<ReportsDashboard> = {}): ReportsApi {
  return {
    downloadExecutiveReport: vi.fn(async () => ({
      blob: new Blob(["%PDF-1.7"], { type: "application/pdf" }),
      fileName: "relatorio-executivo.pdf",
    })),
    getDashboard: vi.fn(async (period: ReportsPeriod) => ({
      ...createDashboard(overrides),
      period,
    })),
  };
}

function createDashboard(
  overrides: Partial<ReportsDashboard> = {},
): ReportsDashboard {
  return {
    financialAvailability: { status: "available" },
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
      closedSalesCents: 45_000_000,
      openReceivablesCents: 12_500_000,
      paidReceiptsCents: 32_000_000,
    },
    sales: {
      closedCount: 2,
      revenueCents: 45_000_000,
      avgTicketCents: 22_500_000,
      grossMarginCents: 9_000_000,
    },
    inventory: {
      averagePriceCents: 8_500_000,
      availableAskingValueCents: 102_000_000,
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
      overdueReceivablesCents: 4_200_000,
      overdueReceivablesCount: 2,
      pendingChecklistsCount: 1,
    },
    owner: {
      availability: { status: "available" },
      completeSalesCount: 1,
      missingAcquisitionCount: 1,
      officialMarginCents: 4_100_000,
      vehicles: [
        {
          acquisitionCents: 16_000_000,
          closedAt: "2026-07-10T12:00:00.000Z",
          commissionCents: 500_000,
          marginCents: 3_500_000,
          marginStatus: "complete",
          operationalCostsCents: 1_000_000,
          plate: "ABC1D23",
          saleId: "sale_1",
          salePriceCents: 21_000_000,
          title: "Honda Civic Touring",
          totalCostCents: 17_500_000,
          unitId: "unit_1",
        },
        {
          acquisitionCents: 0,
          closedAt: "2026-07-09T12:00:00.000Z",
          commissionCents: 400_000,
          marginCents: null,
          marginStatus: "missing_acquisition",
          operationalCostsCents: 900_000,
          plate: "DEF4G56",
          saleId: "sale_2",
          salePriceCents: 24_000_000,
          title: "Toyota Corolla XEi",
          totalCostCents: 1_300_000,
          unitId: "unit_2",
        },
      ],
    },
    finance: {
      availability: { status: "available" },
      categoryBreakdown: [
        {
          count: 3,
          key: "vehicle_preparation",
          paidCents: 1_200_000,
          plannedCents: 1_500_000,
        },
      ],
      paidOutflowCents: 9_000_000,
      pendingOutflowCents: 2_000_000,
      plannedOutflowCents: 11_000_000,
      plannedRevenueCents: 45_000_000,
      realizedBalanceCents: 23_000_000,
      receivedRevenueCents: 32_000_000,
    },
    crm: {
      availability: { status: "available" },
      averageInteractionsPerLead: 3.2,
      conversionRate: 10.5,
      interactionCount: 64,
      lostLeads: 3,
      totalLeads: 20,
      wonLeads: 2,
    },
    documents: {
      availability: { status: "available" },
      byKind: [
        { count: 4, key: "sale_contract" },
        { count: 2, key: "sale_receipt" },
      ],
      issued: 3,
      pendingSignature: 2,
      signed: 4,
      total: 9,
    },
    marketing: {
      availability: {
        reason:
          "O V2 ainda não possui eventos persistidos de visitas e cliques para este período.",
        status: "unavailable",
      },
    },
    ...overrides,
  };
}
