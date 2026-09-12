// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { SessionBootstrap } from "../../account/apiClient";
import { AccountSessionProvider } from "../../account/accountSession";
import type { AgencyStatsReport } from "../apiClient";
import { AgencyStatsPage } from "./AgencyStatsPage";

const getStats = vi.hoisted(() => vi.fn());
vi.mock("./AgencyStatsPage.runtime", () => ({
  createRuntimeAgencyStatsApi: async () => ({ getStats }),
}));

afterEach(() => {
  cleanup();
  getStats.mockReset();
  window.localStorage.clear();
});

describe("AgencyStatsPage", () => {
  it("shows a truthful loading state before the first response", () => {
    getStats.mockReturnValue(new Promise(() => undefined));
    renderPage();

    expect(screen.getByText("Consolidando dados reais da rede")).toBeVisible();
    expect(screen.queryByText("124.502")).not.toBeInTheDocument();
  });

  it("renders real network KPIs, charts and the store table", async () => {
    getStats.mockResolvedValue(report());
    renderPage();

    expect((await screen.findAllByText(/250\.000/))[0]).toBeVisible();
    expect(screen.getByText("Faturamento por loja")).toBeVisible();
    expect(screen.getByText("Origem dos leads")).toBeVisible();
    expect(
      screen.getByRole("heading", { name: "Desempenho por loja" }),
    ).toBeVisible();
    expect(
      screen.getByRole("region", { name: "Tabela de desempenho por loja" }),
    ).toHaveAttribute("tabindex", "0");
    expect(screen.getAllByText("Loja Centro")[0]).toBeVisible();
    expect(screen.getByText(/métricas de tráfego e cliques/i)).toBeVisible();
  });

  it("reloads with the selected store while preserving the date range", async () => {
    getStats.mockResolvedValue(report());
    renderPage();
    await screen.findAllByText("Loja Centro");

    fireEvent.click(screen.getByRole("button", { name: "Loja da análise" }));
    fireEvent.click(screen.getByRole("option", { name: "Loja Centro" }));

    await waitFor(() =>
      expect(getStats).toHaveBeenLastCalledWith(
        "11111111-1111-4111-8111-111111111111",
        expect.objectContaining({ storeId: "store_1" }),
      ),
    );
  });

  it("shows an error with retry and recovers without a blank page", async () => {
    getStats.mockRejectedValueOnce(new Error("network unavailable"));
    renderPage();

    expect(await screen.findByText("Estatísticas indisponíveis")).toBeVisible();
    getStats.mockResolvedValueOnce(report());
    fireEvent.click(screen.getByRole("button", { name: "Tentar novamente" }));

    expect((await screen.findAllByText("Loja Centro"))[0]).toBeVisible();
  });

  it("explains an agency with no managed stores", async () => {
    getStats.mockResolvedValue({
      ...report(),
      availableStores: [],
      stores: [],
      totals: { ...report().totals, storeCount: 0 },
    });
    renderPage();

    expect(
      await screen.findByRole("heading", {
        name: "A rede ainda não possui lojas",
      }),
    ).toBeVisible();
  });
});

function renderPage() {
  return render(
    <AccountSessionProvider session={session()}>
      <MemoryRouter
        initialEntries={["/agency/admin/stats?from=2026-08-01&to=2026-08-22"]}
      >
        <AgencyStatsPage />
      </MemoryRouter>
    </AccountSessionProvider>,
  );
}

function session(): SessionBootstrap {
  return {
    defaultStore: null,
    needsOnboarding: false,
    platformAdmin: false,
    stores: [],
    tenantMemberships: [
      {
        role: "agency",
        status: "active",
        tenantId: "11111111-1111-4111-8111-111111111111",
        tenantName: "Agência Um",
        tenantSlug: "agencia-um",
      },
    ],
    user: {
      clerkUserId: "clerk_agency",
      email: "agency@example.test",
      id: "user_agency",
      name: "Operador",
    },
  };
}

function report(): AgencyStatsReport {
  return {
    availableStores: [
      { storeId: "store_1", storeName: "Loja Centro", storeSlug: "centro" },
    ],
    generatedAt: "2026-08-22T12:00:00.000Z",
    leadSources: [{ count: 10, key: "public_site", label: "Site público" }],
    period: { from: "2026-08-01", to: "2026-08-22" },
    scopeStoreId: null,
    stores: [
      {
        inventory: {
          availableListings: 7,
          reservedUnits: 1,
          totalListings: 12,
        },
        leads: {
          activeCount: 6,
          conversionRate: 20,
          totalCount: 10,
          wonCount: 2,
        },
        sales: {
          averageTicketCents: 12500000,
          closedCount: 2,
          grossMarginCents: 4000000,
          revenueCents: 25000000,
        },
        storeId: "store_1",
        storeName: "Loja Centro",
        storeSlug: "centro",
      },
    ],
    tenantId: "11111111-1111-4111-8111-111111111111",
    totals: {
      inventory: { availableListings: 7, reservedUnits: 1, totalListings: 12 },
      leads: {
        activeCount: 6,
        conversionRate: 20,
        totalCount: 10,
        wonCount: 2,
      },
      sales: {
        averageTicketCents: 12500000,
        closedCount: 2,
        grossMarginCents: 4000000,
        revenueCents: 25000000,
      },
      storeCount: 1,
    },
  };
}
