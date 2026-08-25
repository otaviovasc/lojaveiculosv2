// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { AccountAccessUnavailable } from "./AccountAccessUnavailable";
import { LocalDevAuthPage } from "./LocalDevAuthPages";
import { SignInPage } from "./AuthPages";

vi.mock("./ClerkAuthProvider", () => ({
  useClerkAuthConfiguration: () => ({
    configured: true,
    localAuthBypass: false,
    publishableKey: "pk_test",
    sessionPath: "/auth/session",
    signInPath: "/sign-in",
    signUpPath: "/sign-up",
  }),
}));

vi.mock("@clerk/react-router", () => ({
  SignIn: () => <div data-testid="clerk-signin-mock">Mocked Clerk Sign In</div>,
  UserButton: () => (
    <div data-testid="clerk-userbutton-mock">Mock User Button</div>
  ),
  useAuth: () => ({
    getToken: vi.fn(),
    isLoaded: true,
    isSignedIn: false,
    userId: null,
  }),
  useClerk: () => ({ signOut: vi.fn() }),
  useUser: () => ({
    isLoaded: true,
    user: {
      fullName: "Test User",
      primaryEmailAddress: { emailAddress: "user@example.com" },
    },
  }),
}));

describe("Auth Pages Copy & Visual Structure", () => {
  afterEach(() => {
    cleanup();
    localStorage.clear();
  });

  it("renders SignInPage with direct Portuguese product copy", () => {
    const { container } = render(
      <MemoryRouter initialEntries={["/sign-in"]}>
        <SignInPage />
      </MemoryRouter>,
    );

    expect(screen.getByRole("main")).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Acessar a Loja Veículos" }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        /Entre para gerenciar o estoque, vendas, atendimento e a operação da sua loja/i,
      ),
    ).toBeInTheDocument();
    expect(screen.getByTestId("clerk-signin-mock")).toBeInTheDocument();

    // Two-zone composition: brand pane + exactly one elevated auth surface.
    expect(container.querySelector(".account-auth-grid")).toBeInTheDocument();
    expect(container.querySelector(".account-auth-brand")).toBeInTheDocument();
    expect(container.querySelectorAll(".account-glass-card")).toHaveLength(1);
    expect(
      screen.getByText(/Estoque, vendas e despesas em um só painel/i),
    ).toBeInTheDocument();

    // Verify absence of AI-slop and of the removed eyebrow/H1 redundancy.
    expect(screen.queryByText("Acesso à conta")).not.toBeInTheDocument();
    expect(screen.queryByText("Acesso protegido")).not.toBeInTheDocument();
    expect(
      screen.queryByText(/Sua identidade é validada/i),
    ).not.toBeInTheDocument();
  });

  it("renders LocalDevAuthPage with clean Portuguese copy and role badges", async () => {
    const user = userEvent.setup();

    const { container } = render(
      <MemoryRouter initialEntries={["/auth/dev"]}>
        <Routes>
          <Route path="/auth/dev" element={<LocalDevAuthPage />} />
          <Route
            path="/auth/session"
            element={<div>Redirecionado para sessão</div>}
          />
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getByRole("main")).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Selecionar perfil de teste" }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Escolha um perfil para testar permissões/i),
    ).toBeInTheDocument();

    // Profiles render as restrained rows inside the single auth surface.
    expect(container.querySelectorAll(".account-glass-card")).toHaveLength(1);
    expect(
      container.querySelector(".account-profile-list"),
    ).toBeInTheDocument();
    expect(
      container.querySelectorAll(".account-profile-row").length,
    ).toBeGreaterThan(0);
    expect(
      container.querySelector(".account-card-option"),
    ).not.toBeInTheDocument();

    expect(screen.getAllByText("Proprietário").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Supervisor").length).toBeGreaterThan(0);

    const ownerButton = screen.getByRole("button", {
      name: /^Seed Owner\b/,
    });
    await user.click(ownerButton);

    expect(
      await screen.findByText("Redirecionado para sessão"),
    ).toBeInTheDocument();
  });

  it("renders AccountAccessUnavailable with direct Portuguese copy", () => {
    const onRetry = vi.fn();

    render(
      <MemoryRouter>
        <AccountAccessUnavailable onRetry={onRetry} />
      </MemoryRouter>,
    );

    expect(screen.getByRole("main")).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Acesso à loja pendente" }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        /Sua conta ainda não possui uma loja vinculada com acesso ativo/i,
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Verificar novamente" }),
    ).toBeInTheDocument();
  });
});
