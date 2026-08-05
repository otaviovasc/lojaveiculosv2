// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import { App } from "./App";

vi.mock("../features/account/AuthPages", () => {
  const route = ({ children }: { children: ReactNode }) => <>{children}</>;
  return {
    ProtectedRoute: route,
    SessionBootstrapPage: () => null,
    SignInPage: () => null,
    SignUpPage: () => null,
  };
});

vi.mock("./AppLazyRoutes", async () => {
  const { useEffect } = await import("react");
  const { Outlet, useNavigate } = await import("react-router-dom");
  const { LandingPage } = await import("../features/marketing/LandingPage");
  const { ClerkAuthProvider } =
    await import("../features/account/ClerkAuthProvider");
  const { useSessionBootstrapHandoff } =
    await import("../features/account/sessionBootstrapHandoff");
  const emptyRoute = () => null;
  return {
    AuthenticatedRoutes: ({
      section,
    }: {
      section:
        | "agency-admin"
        | "onboarding"
        | "platform-admin"
        | "platform-observability"
        | "session-bootstrap"
        | "sign-in"
        | "sign-up"
        | "store-admin";
    }) => {
      const { peek, store } = useSessionBootstrapHandoff();
      const navigate = useNavigate();

      useEffect(() => {
        if (section !== "session-bootstrap") return;
        store("user_1", {
          defaultStore: null,
          needsOnboarding: true,
          platformAdmin: false,
          stores: [],
          tenantMemberships: [],
          user: {
            clerkUserId: "user_1",
            email: "user@example.com",
            id: "identity_user_1",
            name: "User",
          },
        });
        void navigate("/onboarding", { replace: true });
      }, [navigate, section, store]);

      if (section === "onboarding") {
        return peek("user_1") ? (
          <div>Onboarding handoff ready</div>
        ) : (
          <div>Onboarding handoff missing</div>
        );
      }

      return <div>Authenticated route: {section}</div>;
    },
    AdminApp: emptyRoute,
    ClerkAuthProvider,
    AgencyBillingPage: emptyRoute,
    AgencyCrederePage: () => <div>Credere agency route</div>,
    AgencyCreateStorePage: emptyRoute,
    AgencyDashboardPage: emptyRoute,
    AgencyLayout: () => <Outlet />,
    AgencyStatsPage: emptyRoute,
    LandingPage,
    ObservabilityPage: () => <div>Observability route</div>,
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
        <App />
      </MemoryRouter>,
    );

    expect(
      await screen.findByRole("heading", {
        level: 1,
        name: /o sistema que faz você vender até/i,
      }),
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
        <App />
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

  it("registers the agency Credere management route inside the agency layout", async () => {
    render(
      <MemoryRouter initialEntries={["/agency/admin/credere"]}>
        <App />
      </MemoryRouter>,
    );

    expect(
      await screen.findByText("Authenticated route: agency-admin"),
    ).toBeInTheDocument();
  });

  it("registers the platform observability command center route", async () => {
    render(
      <MemoryRouter initialEntries={["/platform/observability"]}>
        <App />
      </MemoryRouter>,
    );

    expect(
      await screen.findByText("Authenticated route: platform-observability"),
    ).toBeInTheDocument();
  });

  it.each([
    ["/dashboard", "Authenticated route: store-admin"],
    ["/onboarding", "Onboarding handoff missing"],
  ])(
    "allows %s to render nested authenticated routes without a router warning",
    async (path, routeLabel) => {
      const consoleWarn = vi
        .spyOn(console, "warn")
        .mockImplementation(() => {});

      render(
        <MemoryRouter initialEntries={[path]}>
          <App />
        </MemoryRouter>,
      );

      expect(await screen.findByText(routeLabel)).toBeInTheDocument();
      expect(consoleWarn).not.toHaveBeenCalledWith(
        expect.stringContaining('parent route path has no trailing "*"'),
      );
      consoleWarn.mockRestore();
    },
  );

  it("preserves the session bootstrap across the outer auth route transition", async () => {
    render(
      <MemoryRouter initialEntries={["/auth/session"]}>
        <App />
      </MemoryRouter>,
    );

    expect(
      await screen.findByText("Onboarding handoff ready"),
    ).toBeInTheDocument();
    expect(
      screen.queryByText("Onboarding handoff missing"),
    ).not.toBeInTheDocument();
  });
});
