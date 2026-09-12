// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { SessionBootstrap } from "./apiClient";
import { OwnerOnboardingPage } from "./OwnerOnboardingPage";
import { SessionBootstrapHandoffProvider } from "./sessionBootstrapHandoff";

const clerk = vi.hoisted(() => ({
  auth: {
    getToken: vi.fn(async () => "token"),
    isLoaded: true,
    isSignedIn: true,
    userId: "user_1" as string | null,
  },
  signIn: vi.fn((_props: Record<string, unknown>) => null),
  signUp: vi.fn((_props: Record<string, unknown>) => null),
}));
const bootstrap = vi.hoisted(() => vi.fn<() => Promise<SessionBootstrap>>());

vi.mock("@clerk/react-router", () => ({
  SignIn: clerk.signIn,
  SignUp: clerk.signUp,
  useAuth: () => clerk.auth,
}));

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

vi.mock("./runtimeApi", () => ({
  createRuntimeAccountApi: async () => ({ bootstrap }),
}));

vi.mock("./UserAccountButton", () => ({
  UserAccountButton: () => null,
}));

import {
  ProtectedRoute,
  SessionBootstrapPage,
  SignInPage,
  SignUpPage,
} from "./AuthPages";

describe("Clerk auth page redirects", () => {
  afterEach(() => {
    cleanup();
    clerk.signIn.mockClear();
    clerk.signUp.mockClear();
    clerk.auth.isLoaded = true;
    clerk.auth.isSignedIn = true;
    clerk.auth.userId = "user_1";
    bootstrap.mockReset();
  });

  it("lets the provider own sign-in and transferred sign-up redirects", () => {
    render(<SignInPage />);

    expect(clerk.signIn.mock.calls[0]?.[0]).toEqual(
      expect.objectContaining({
        path: "/sign-in",
        routing: "path",
      }),
    );
    expect(clerk.signIn.mock.calls[0]?.[0]).not.toHaveProperty(
      "forceRedirectUrl",
    );
    expect(clerk.signIn.mock.calls[0]?.[0]).not.toHaveProperty(
      "signUpForceRedirectUrl",
    );
    expect(clerk.signIn.mock.calls[0]?.[0]).not.toHaveProperty("signUpUrl");
  });

  it("canonicalizes the legacy sign-up route to the single sign-in-or-up flow", async () => {
    render(
      <MemoryRouter initialEntries={["/sign-up"]}>
        <Routes>
          <Route path="/sign-up" element={<SignUpPage />} />
          <Route path="/sign-in" element={<div>Fluxo unificado</div>} />
        </Routes>
      </MemoryRouter>,
    );

    expect(await screen.findByText("Fluxo unificado")).toBeInTheDocument();
    expect(clerk.signUp).not.toHaveBeenCalled();
  });

  it("redirects signed-out protected routes to a clean sign-in URL", async () => {
    clerk.auth.isSignedIn = false;
    clerk.auth.userId = null;

    render(
      <MemoryRouter initialEntries={["/onboarding"]}>
        <Routes>
          <Route
            path="/onboarding"
            element={
              <ProtectedRoute access="onboarding">
                <div>Onboarding protegido</div>
              </ProtectedRoute>
            }
          />
          <Route path="/sign-in" element={<div>Login limpo</div>} />
        </Routes>
      </MemoryRouter>,
    );

    expect(await screen.findByText("Login limpo")).toBeInTheDocument();
    expect(screen.queryByText("Onboarding protegido")).not.toBeInTheDocument();
  });

  it("sends an existing active account to its dashboard after auth transfer", async () => {
    bootstrap.mockResolvedValue(sessionWithStore("active"));

    renderSessionBootstrap();

    expect(await screen.findByText("Dashboard pronto")).toBeInTheDocument();
  });

  it("renders onboarding after bootstrap without requiring a second request", async () => {
    bootstrap
      .mockResolvedValueOnce(sessionNeedingOnboarding())
      .mockImplementation(() => new Promise(() => undefined));

    renderNewAccountFlow("/auth/session");

    expect(await screen.findByLabelText("Nome comercial")).toBeInTheDocument();
    expect(bootstrap).toHaveBeenCalledTimes(1);
  });

  it("loads bootstrap normally when onboarding is opened directly", async () => {
    bootstrap.mockResolvedValue(sessionNeedingOnboarding());

    renderNewAccountFlow("/onboarding");

    expect(await screen.findByLabelText("Nome comercial")).toBeInTheDocument();
    expect(bootstrap).toHaveBeenCalledTimes(1);
  });

  it("stops on an actionable state when the authenticated account has only pending access", async () => {
    bootstrap.mockResolvedValue(sessionWithStore("invited"));

    renderSessionBootstrap();

    expect(
      await screen.findByRole("heading", { name: "Acesso à loja pendente" }),
    ).toBeInTheDocument();
  });
});

function renderSessionBootstrap() {
  return render(
    <MemoryRouter initialEntries={["/auth/session"]}>
      <SessionBootstrapHandoffProvider>
        <Routes>
          <Route path="/auth/session" element={<SessionBootstrapPage />} />
          <Route path="/dashboard" element={<div>Dashboard pronto</div>} />
        </Routes>
      </SessionBootstrapHandoffProvider>
    </MemoryRouter>,
  );
}

function renderNewAccountFlow(initialEntry: "/auth/session" | "/onboarding") {
  return render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <SessionBootstrapHandoffProvider>
        <Routes>
          <Route path="/auth/session" element={<SessionBootstrapPage />} />
          <Route
            path="/onboarding"
            element={
              <ProtectedRoute access="onboarding">
                <OwnerOnboardingPage />
              </ProtectedRoute>
            }
          />
        </Routes>
      </SessionBootstrapHandoffProvider>
    </MemoryRouter>,
  );
}

function sessionNeedingOnboarding(): SessionBootstrap {
  return {
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
  };
}

function sessionWithStore(status: "active" | "invited"): SessionBootstrap {
  const store = {
    effectivePermissions: [],
    role: "owner",
    status,
    storeId: "store_1",
    storeName: "Loja Teste",
    storeSlug: "loja-teste",
    tenantId: "tenant_1",
    tenantName: "Loja Teste",
  } satisfies SessionBootstrap["stores"][number];
  return {
    defaultStore: status === "active" ? store : null,
    needsOnboarding: false,
    platformAdmin: false,
    stores: [store],
    tenantMemberships: [],
    user: {
      clerkUserId: "user_1",
      email: "user@example.com",
      id: "identity_user_1",
      name: "User",
    },
  };
}
