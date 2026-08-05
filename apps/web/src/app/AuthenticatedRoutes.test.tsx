// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { MemoryRouter, Outlet, Route, Routes } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AuthenticatedRoutes } from "./AuthenticatedRoutes";

vi.mock("../features/account/AuthPages", () => ({
  ProtectedRoute: ({ children }: { children: ReactNode }) => <>{children}</>,
  SessionBootstrapPage: () => null,
  SignInPage: () => <div>Sign in route</div>,
  SignUpPage: () => null,
}));

vi.mock("./AppLazyRoutes", () => {
  const emptyRoute = () => null;
  return {
    AgencyBillingPage: emptyRoute,
    AgencyCreateStorePage: emptyRoute,
    AgencyCrederePage: () => <div>Credere agency route</div>,
    AgencyDashboardPage: emptyRoute,
    AgencyLayout: () => <Outlet />,
    AgencyStatsPage: emptyRoute,
    ObservabilityPage: () => <div>Observability route</div>,
    OwnerOnboardingPage: emptyRoute,
    PlatformAdminPage: emptyRoute,
  };
});

describe("AuthenticatedRoutes", () => {
  afterEach(cleanup);

  it("keeps the agency Credere route behind the authenticated route boundary", async () => {
    render(
      <MemoryRouter initialEntries={["/agency/admin/credere"]}>
        <Routes>
          <Route
            path="/agency/admin/*"
            element={<AuthenticatedRoutes section="agency-admin" />}
          />
        </Routes>
      </MemoryRouter>,
    );

    expect(await screen.findByText("Credere agency route")).toBeInTheDocument();
  });

  it("keeps the platform observability route behind the authenticated route boundary", async () => {
    render(
      <MemoryRouter initialEntries={["/platform/observability"]}>
        <AuthenticatedRoutes section="platform-observability" />
      </MemoryRouter>,
    );

    expect(await screen.findByText("Observability route")).toBeInTheDocument();
  });

  it("renders sign-in directly without entering a protected descendant route", () => {
    render(
      <MemoryRouter initialEntries={["/sign-in"]}>
        <AuthenticatedRoutes section="sign-in" />
      </MemoryRouter>,
    );

    expect(screen.getByText("Sign in route")).toBeInTheDocument();
  });
});
