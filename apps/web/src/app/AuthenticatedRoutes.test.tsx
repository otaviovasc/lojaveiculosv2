// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { MemoryRouter, Outlet } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AuthenticatedRoutes } from "./AuthenticatedRoutes";

vi.mock("../features/account/AuthPages", () => ({
  ProtectedRoute: ({ children }: { children: ReactNode }) => <>{children}</>,
  SessionBootstrapPage: () => null,
  SignInPage: () => null,
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
        <AuthenticatedRoutes />
      </MemoryRouter>,
    );

    expect(await screen.findByText("Credere agency route")).toBeInTheDocument();
  });

  it("keeps the platform observability route behind the authenticated route boundary", async () => {
    render(
      <MemoryRouter initialEntries={["/platform/observability"]}>
        <AuthenticatedRoutes />
      </MemoryRouter>,
    );

    expect(await screen.findByText("Observability route")).toBeInTheDocument();
  });
});
