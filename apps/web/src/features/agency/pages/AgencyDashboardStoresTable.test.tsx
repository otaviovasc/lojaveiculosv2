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
    const onOpenStoreModule = vi.fn();
    render(
      <AgencyStoresTable
        hasActiveFilters={false}
        loading={false}
        navigate={navigate}
        onClearFilters={vi.fn()}
        onManageStore={vi.fn()}
        onOpenStoreModule={onOpenStoreModule}
        readStoreModuleAccess={() => ({ canOpen: true, reason: null })}
        stores={[store()]}
      />,
    );

    fireEvent.click(
      screen.getByRole("button", { name: "Gerenciar plano de Loja Centro" }),
    );

    expect(navigate).toHaveBeenCalledWith(
      "/agency/admin/unified-billing?storeId=store_1",
    );
    expect(
      screen.getByRole("button", { name: "Gerenciar Loja Centro no admin" }),
    ).toBeVisible();
    fireEvent.click(
      screen.getByRole("button", { name: "Abrir CRM de Loja Centro" }),
    );
    expect(onOpenStoreModule).toHaveBeenCalledWith(
      expect.objectContaining({ id: "store_1" }),
      "crm",
    );
    fireEvent.click(
      screen.getByRole("button", {
        name: "Abrir outros módulos de Loja Centro",
      }),
    );
    fireEvent.click(screen.getByRole("menuitem", { name: "Public API" }));
    expect(onOpenStoreModule).toHaveBeenCalledWith(
      expect.objectContaining({ id: "store_1" }),
      "public-api",
    );
    expect(
      screen.getByRole("link", { name: "Ver site público de Loja Centro" }),
    ).toHaveAttribute("href", "https://loja-centro.lojaveiculos.com.br");
  });

  it("keeps agency administration available when a module is not contracted", () => {
    const onManageStore = vi.fn();
    const onOpenStoreModule = vi.fn();
    render(
      <AgencyStoresTable
        hasActiveFilters={false}
        loading={false}
        navigate={vi.fn()}
        onClearFilters={vi.fn()}
        onManageStore={onManageStore}
        onOpenStoreModule={onOpenStoreModule}
        readStoreModuleAccess={() => ({
          canOpen: false,
          reason: "Módulo não contratado para esta loja.",
        })}
        stores={[store()]}
      />,
    );

    expect(
      screen.queryByText("Delegação operacional necessária"),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole("button", {
        name: "Módulo não contratado para esta loja.",
      }),
    ).toBeDisabled();
    const admin = screen.getByRole("button", {
      name: "Gerenciar Loja Centro no admin",
    });
    expect(admin).toBeEnabled();
    fireEvent.click(admin);
    expect(onManageStore).toHaveBeenCalledOnce();
    expect(onOpenStoreModule).not.toHaveBeenCalled();
  });

  it("moves focus through the module menu and restores its trigger on Escape", () => {
    render(
      <AgencyStoresTable
        hasActiveFilters={false}
        loading={false}
        navigate={vi.fn()}
        onClearFilters={vi.fn()}
        onManageStore={vi.fn()}
        onOpenStoreModule={vi.fn()}
        readStoreModuleAccess={() => ({ canOpen: true, reason: null })}
        stores={[store()]}
      />,
    );

    const trigger = screen.getByRole("button", {
      name: "Abrir outros módulos de Loja Centro",
    });
    fireEvent.click(trigger);
    const [simulations, fiscal, publicApi] = screen.getAllByRole("menuitem");
    expect(simulations).toHaveFocus();
    expect(simulations).toHaveAttribute("tabindex", "0");
    expect(fiscal).toHaveAttribute("tabindex", "-1");
    expect(publicApi).toHaveAttribute("tabindex", "-1");
    expect(
      document.querySelector('button[aria-hidden="true"].fixed'),
    ).toHaveAttribute("tabindex", "-1");

    fireEvent.keyDown(simulations!, { key: "ArrowDown" });
    expect(fiscal).toHaveFocus();
    fireEvent.keyDown(fiscal!, { key: "End" });
    expect(publicApi).toHaveFocus();
    fireEvent.keyDown(publicApi!, { key: "Home" });
    expect(simulations).toHaveFocus();
    fireEvent.keyDown(simulations!, { key: "ArrowUp" });
    expect(publicApi).toHaveFocus();
    fireEvent.keyDown(publicApi!, { key: "ArrowDown" });
    expect(simulations).toHaveFocus();
    fireEvent.keyDown(simulations!, { key: "Escape" });

    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
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
