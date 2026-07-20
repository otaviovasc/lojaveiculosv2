// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ClerkAuthProvider } from "../features/account/ClerkAuthProvider";
import { App } from "./App";

vi.mock("./AppLazyRoutes", async () => {
  const { LandingPage } = await import("../features/marketing/LandingPage");
  const emptyRoute = () => null;
  return {
    AdminApp: emptyRoute,
    AgencyBillingPage: emptyRoute,
    AgencyCreateStorePage: emptyRoute,
    AgencyDashboardPage: emptyRoute,
    AgencyLayout: emptyRoute,
    AgencyStatsPage: emptyRoute,
    LandingPage,
    OwnerOnboardingPage: emptyRoute,
    PlatformAdminPage: emptyRoute,
    PublicCustomPageRoute: emptyRoute,
    PublicStorefrontPage: emptyRoute,
  };
});

describe("App routes", () => {
  afterEach(cleanup);

  it("serves the root path as a public landing page", async () => {
    render(
      <MemoryRouter initialEntries={["/"]}>
        <ClerkAuthProvider>
          <App />
        </ClerkAuthProvider>
      </MemoryRouter>,
    );

    expect(
      await screen.findByRole("heading", { level: 1, name: "Loja Veículos" }),
    ).toBeInTheDocument();
    expect(screen.getByTestId("landing-hero-shader")).toHaveAttribute(
      "data-shader-state",
      "fallback",
    );
    expect(
      screen.queryByText("Configuração de autenticação ausente"),
    ).not.toBeInTheDocument();
  });

  it("serves a friendly 404 page for unknown paths instead of booting the admin app", async () => {
    render(
      <MemoryRouter initialEntries={["/nao-existe/nada"]}>
        <ClerkAuthProvider>
          <App />
        </ClerkAuthProvider>
      </MemoryRouter>,
    );

    expect(
      await screen.findByRole("heading", {
        level: 1,
        name: "Página não encontrada",
      }),
    ).toBeInTheDocument();
    expect(screen.getByText("404")).toBeInTheDocument();
  });
});
