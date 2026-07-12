// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import type { AccountApi, SessionBootstrap } from "../../account/apiClient";
import { AccountSessionProvider } from "../../account/accountSession";
import { AgencyCreateStorePage } from "./AgencyCreateStorePage";

describe("AgencyCreateStorePage", () => {
  afterEach(cleanup);

  it("waits for an active agency before exposing the creation form", async () => {
    let resolveBootstrap!: (value: SessionBootstrap) => void;
    const bootstrap = new Promise<SessionBootstrap>((resolve) => {
      resolveBootstrap = resolve;
    });
    renderPage(createApi({ bootstrap: vi.fn(() => bootstrap) }));

    expect(screen.getByText("Carregando contas de agência")).toBeVisible();
    expect(
      screen.queryByRole("button", { name: "Criar concessionária" }),
    ).not.toBeInTheDocument();

    resolveBootstrap(createBootstrap());

    expect(
      await screen.findByRole("button", { name: "Criar concessionária" }),
    ).toBeDisabled();
  });

  it("submits the validated store and returns to the agency network", async () => {
    const api = createApi();
    const user = userEvent.setup();
    renderPage(api);

    const name = await screen.findByRole("textbox", {
      name: "Nome da concessionária",
    });
    await user.type(name, "Auto Bahia Veículos");

    expect(
      screen.getByRole("textbox", { name: "Endereço público da loja" }),
    ).toHaveValue("auto-bahia-veiculos");

    await user.click(
      screen.getByRole("button", { name: "Criar concessionária" }),
    );

    await waitFor(() =>
      expect(api.createAgencyStore).toHaveBeenCalledWith({
        publicSlug: "auto-bahia-veiculos",
        storeTradingName: "Auto Bahia Veículos",
        tenantId: "tenant_agency",
      }),
    );
    expect(await screen.findByText("Rede de lojas carregada")).toBeVisible();
  });

  it("shows an honest unavailable state when the session has no agency", async () => {
    const api = createApi({
      bootstrap: vi.fn(async () => createBootstrap({ tenantMemberships: [] })),
    });
    renderPage(api);

    expect(await screen.findByText("Criação indisponível")).toBeVisible();
    expect(
      screen.queryByRole("button", { name: "Criar concessionária" }),
    ).not.toBeInTheDocument();
  });

  it("lets the operator retry a failed agency lookup", async () => {
    const bootstrap = vi
      .fn<AccountApi["bootstrap"]>()
      .mockRejectedValueOnce(new Error("network unavailable"))
      .mockResolvedValueOnce(createBootstrap());
    const api = createApi({ bootstrap });
    const user = userEvent.setup();
    renderPage(api);

    expect(
      await screen.findByText("Contas de agência indisponíveis"),
    ).toBeVisible();
    await user.click(
      screen.getByRole("button", { name: "Tentar carregar novamente" }),
    );

    expect(
      await screen.findByRole("button", { name: "Criar concessionária" }),
    ).toBeDisabled();
    expect(bootstrap).toHaveBeenCalledTimes(2);
  });
});

function renderPage(api: AccountApi) {
  return render(
    <AccountSessionProvider session={createBootstrap()}>
      <MemoryRouter initialEntries={["/agency/admin/create-store"]}>
        <Routes>
          <Route
            element={<AgencyCreateStorePage apiFactory={async () => api} />}
            path="/agency/admin/create-store"
          />
          <Route
            element={<div>Rede de lojas carregada</div>}
            path="/agency/admin"
          />
        </Routes>
      </MemoryRouter>
    </AccountSessionProvider>,
  );
}

function createApi(overrides: Partial<AccountApi> = {}): AccountApi {
  return {
    bootstrap: vi.fn(async () => createBootstrap()),
    createAgency: vi.fn(),
    createAgencyStore: vi.fn(async () => ({
      role: "owner",
      storeId: "store_new",
      storeName: "Auto Bahia Veículos",
      storeSlug: "auto-bahia-veiculos",
      tenantId: "tenant_agency",
      tenantName: "Agência Teste",
    })),
    createOwnerStore: vi.fn(),
    resendInvitation: vi.fn(),
    ...overrides,
  };
}

function createBootstrap(
  overrides: Partial<SessionBootstrap> = {},
): SessionBootstrap {
  return {
    defaultStore: null,
    needsOnboarding: false,
    platformAdmin: false,
    stores: [],
    tenantMemberships: [
      {
        role: "agency",
        status: "active",
        tenantId: "tenant_agency",
        tenantName: "Agência Teste",
        tenantSlug: "agencia-teste",
      },
    ],
    user: {
      clerkUserId: "clerk_agency_user",
      email: "agency@example.com",
      id: "user_agency",
      name: "Agente",
    },
    ...overrides,
  };
}
