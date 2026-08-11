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
    render(
      <MemoryRouter initialEntries={["/sign-in"]}>
        <SignInPage />
      </MemoryRouter>,
    );

    expect(screen.getByRole("main")).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Acessar a Loja Veículos" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Acesso à conta")).toBeInTheDocument();
    expect(
      screen.getByText(
        /Entre para gerenciar o estoque, vendas, atendimento e a operação da sua loja/i,
      ),
    ).toBeInTheDocument();
    expect(screen.getByTestId("clerk-signin-mock")).toBeInTheDocument();

    // Verify absence of AI-slop
    expect(screen.queryByText("Acesso protegido")).not.toBeInTheDocument();
    expect(
      screen.queryByText(/Sua identidade é validada/i),
    ).not.toBeInTheDocument();
  });

  it("renders LocalDevAuthPage with clean Portuguese copy and role badges", async () => {
    const user = userEvent.setup();

    render(
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
    expect(screen.getByText("Ambiente local")).toBeInTheDocument();
    expect(
      screen.getByText(/Escolha um perfil para testar permissões/i),
    ).toBeInTheDocument();

    expect(screen.getAllByText("Proprietário").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Supervisor").length).toBeGreaterThan(0);

    const ownerButton = screen.getByText("Seed Owner");
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
