// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { SessionBootstrap } from "../account/apiClient";
import { AccountSessionProvider } from "../account/accountSession";
import { AgencyLayout } from "./AgencyLayout";

vi.mock("../account/UserAccountButton", () => ({
  UserAccountButton: () => <button type="button">Conta</button>,
}));

describe("AgencyLayout", () => {
  afterEach(cleanup);

  it("exposes names for the collapsed desktop navigation", () => {
    render(
      <AccountSessionProvider session={session()}>
        <MemoryRouter initialEntries={["/agency/admin"]}>
          <Routes>
            <Route element={<AgencyLayout />} path="/agency/admin">
              <Route index element={<p>Conteúdo</p>} />
            </Route>
          </Routes>
        </MemoryRouter>
      </AccountSessionProvider>,
    );

    const desktopNavigation = screen.getByRole("navigation", {
      name: "Menu principal",
    });
    expect(
      desktopNavigation.querySelector('a[title="Portal da agência"]'),
    ).toBeInTheDocument();
    expect(
      desktopNavigation.querySelector('a[title="Cobrança unificada"]'),
    ).toBeInTheDocument();
    expect(
      desktopNavigation.querySelector('a[title="Acesso da equipe"]'),
    ).toBeInTheDocument();
    expect(
      desktopNavigation.querySelector('a[title="Adicionar loja"]'),
    ).toBeInTheDocument();
  });

  it("keeps keyboard focus inside the open mobile drawer", () => {
    render(
      <AccountSessionProvider session={session()}>
        <MemoryRouter initialEntries={["/agency/admin"]}>
          <Routes>
            <Route element={<AgencyLayout />} path="/agency/admin">
              <Route index element={<p>Conteúdo</p>} />
            </Route>
          </Routes>
        </MemoryRouter>
      </AccountSessionProvider>,
    );

    fireEvent.click(
      screen.getByRole("button", { name: "Abrir menu da agência" }),
    );
    const drawer = document.querySelector("#agency-mobile-navigation");
    expect(drawer).not.toBeNull();
    const drawerQueries = within(drawer as HTMLElement);
    const closeButton = drawerQueries.getByRole("button", {
      name: "Fechar menu da agência",
    });
    const accountButton = drawerQueries.getByRole("button", { name: "Conta" });

    expect(closeButton).toHaveFocus();
    fireEvent.keyDown(document, { key: "Tab", shiftKey: true });
    expect(accountButton).toHaveFocus();
    fireEvent.keyDown(document, { key: "Tab" });
    expect(closeButton).toHaveFocus();
  });
});

function session(): SessionBootstrap {
  return {
    defaultStore: null,
    needsOnboarding: false,
    platformAdmin: false,
    stores: [],
    tenantMemberships: [],
    user: {
      clerkUserId: "clerk_agency",
      email: "agency@example.test",
      id: "user_agency",
      name: "Operador",
    },
  };
}
