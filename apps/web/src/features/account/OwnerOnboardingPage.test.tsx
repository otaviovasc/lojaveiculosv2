// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import * as ReactRouterDom from "react-router-dom";
import { OwnerOnboardingPage } from "./OwnerOnboardingPage";
import { AccountSessionProvider } from "./accountSession";

type OwnerStoreApi = {
  createOwnerStore: (input: unknown) => Promise<unknown>;
};

const mocks = vi.hoisted(() => ({
  createOwnerStore: vi.fn<(input: unknown) => Promise<unknown>>(),
  createRuntimeAccountApi: vi.fn<() => Promise<OwnerStoreApi>>(),
  navigate: vi.fn<(to: string, options?: { replace?: boolean }) => void>(),
}));

vi.mock("./runtimeApi", () => ({
  createRuntimeAccountApi: () => mocks.createRuntimeAccountApi(),
}));

vi.mock("react-router-dom", async (importOriginal) => {
  const actual = await importOriginal<typeof ReactRouterDom>();
  return {
    ...actual,
    useNavigate: () => mocks.navigate,
  };
});

function renderOnboardingPage() {
  return render(
    <ReactRouterDom.MemoryRouter>
      <AccountSessionProvider
        session={{
          defaultStore: null,
          needsOnboarding: true,
          platformAdmin: false,
          stores: [],
          tenantMemberships: [],
          user: {
            clerkUserId: "user_1",
            email: "owner@example.com",
            id: "user_1",
            name: "Owner",
          },
        }}
      >
        <OwnerOnboardingPage />
      </AccountSessionProvider>
    </ReactRouterDom.MemoryRouter>,
  );
}

describe("OwnerOnboardingPage", () => {
  afterEach(() => {
    cleanup();
    localStorage.clear();
    mocks.createOwnerStore.mockReset();
    mocks.createRuntimeAccountApi.mockReset();
    mocks.navigate.mockReset();
  });

  it("renders clean Portuguese product copy without AI/SaaS fluff", () => {
    renderOnboardingPage();

    expect(screen.getByRole("main")).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Criar sua primeira loja" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Nova loja")).toBeInTheDocument();
    expect(
      screen.getByText(/Informe os dados da sua loja para iniciar a operação/i),
    ).toBeInTheDocument();
    expect(screen.getByText("Sua loja pronta para operar")).toBeInTheDocument();
    expect(screen.getByText("Gestão de estoque")).toBeInTheDocument();
    expect(screen.getByText("Atendimento e CRM")).toBeInTheDocument();

    // Verify AI-slop terms are absent
    expect(screen.queryByText("Conta owner")).not.toBeInTheDocument();
    expect(
      screen.queryByText(/permissões e auditoria/i),
    ).not.toBeInTheDocument();
    expect(screen.queryByText("Acesso protegido")).not.toBeInTheDocument();
  });

  it("shows validation error on empty form submission", async () => {
    const user = userEvent.setup();
    renderOnboardingPage();

    await user.click(screen.getByRole("button", { name: "Criar loja" }));

    expect(screen.getByText("Revise os campos marcados.")).toBeInTheDocument();
    expect(
      screen.getByText("Informe o nome comercial com pelo menos 2 caracteres."),
    ).toBeInTheDocument();
    expect(mocks.createOwnerStore).not.toHaveBeenCalled();
  });

  it("refreshes the Clerk session bootstrap after creating the first store", async () => {
    const user = userEvent.setup();
    mocks.createOwnerStore.mockResolvedValue({
      role: "owner",
      storeId: "store_1",
      storeName: "Otavio Veiculos",
      storeSlug: "otavio-veiculos",
      tenantId: "tenant_1",
      tenantName: "Otavio Veiculos",
    });
    mocks.createRuntimeAccountApi.mockResolvedValue({
      createOwnerStore: mocks.createOwnerStore,
    });

    renderOnboardingPage();

    await user.type(screen.getByLabelText("Nome comercial"), "Otavio Veiculos");
    await user.click(screen.getByRole("button", { name: "Criar loja" }));

    expect(mocks.createOwnerStore).toHaveBeenCalledWith(
      expect.objectContaining({
        publicSlug: "otavio-veiculos",
        storeTradingName: "Otavio Veiculos",
      }),
    );
    expect(mocks.navigate).toHaveBeenCalledWith("/auth/session", {
      replace: true,
    });
  });
});
