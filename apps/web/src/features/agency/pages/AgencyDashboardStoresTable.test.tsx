// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { AgencyStore } from "./AgencyDashboardPage.model";
import { AgencyStoresTable } from "./AgencyDashboardStoresTable";

describe("AgencyStoresTable", () => {
  afterEach(cleanup);

  it("keeps the selected store in the billing route and labels row actions", () => {
    const navigate = vi.fn();
    render(
      <AgencyStoresTable
        hasActiveFilters={false}
        loading={false}
        navigate={navigate}
        onClearFilters={vi.fn()}
        onManageStore={vi.fn()}
        stores={[store()]}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Gerenciar plano" }));

    expect(navigate).toHaveBeenCalledWith(
      "/agency/admin/unified-billing?storeId=store_1",
    );
    expect(
      screen.getByRole("button", { name: "Gerenciar loja no admin" }),
    ).toBeVisible();
    expect(
      screen.getByRole("link", { name: "Ver site público de Loja Centro" }),
    ).toHaveAttribute("href", "https://loja-centro.lojaveiculos.com.br");
  });
});

function store(): AgencyStore {
  return {
    _count: { veiculos: 12 },
    asaas_customer_id: null,
    data_criacao: "2026-08-01T12:00:00.000Z",
    id: "store_1",
    nome_da_loja: "Loja Centro",
    plan_end_date: "2099-12-31T12:00:00.000Z",
    plano: "Growth",
    settings: { profile_name: "Loja Centro" },
    status_assinatura: "ATIVA",
    subdominio: "loja-centro",
  };
}
