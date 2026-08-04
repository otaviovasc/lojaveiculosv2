// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { SessionBootstrap } from "./apiClient";

const clerk = vi.hoisted(() => ({
  signIn: vi.fn((_props: Record<string, unknown>) => null),
  signUp: vi.fn((_props: Record<string, unknown>) => null),
}));
const bootstrap = vi.hoisted(() => vi.fn<() => Promise<SessionBootstrap>>());

vi.mock("@clerk/react", () => ({
  RedirectToSignIn: () => null,
  SignIn: clerk.signIn,
  SignUp: clerk.signUp,
  useAuth: () => ({
    getToken: vi.fn(async () => "token"),
    isLoaded: true,
    isSignedIn: true,
    userId: "user_1",
  }),
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

import { SessionBootstrapPage, SignInPage, SignUpPage } from "./AuthPages";

describe("Clerk auth page redirects", () => {
  afterEach(() => {
    cleanup();
    clerk.signIn.mockClear();
    clerk.signUp.mockClear();
    bootstrap.mockReset();
  });

  it("forces sign-in and transferred sign-up attempts through session bootstrap", () => {
    render(<SignInPage />);

    expect(clerk.signIn.mock.calls[0]?.[0]).toEqual(
      expect.objectContaining({
        forceRedirectUrl: "/auth/session",
        signUpForceRedirectUrl: "/auth/session",
      }),
    );
  });

  it("forces sign-up and transferred sign-in attempts through session bootstrap", () => {
    render(<SignUpPage />);

    expect(clerk.signUp.mock.calls[0]?.[0]).toEqual(
      expect.objectContaining({
        forceRedirectUrl: "/auth/session",
        signInForceRedirectUrl: "/auth/session",
      }),
    );
  });

  it("sends an existing active account to its dashboard after auth transfer", async () => {
    bootstrap.mockResolvedValue(sessionWithStore("active"));

    renderSessionBootstrap();

    expect(await screen.findByText("Dashboard pronto")).toBeInTheDocument();
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
      <Routes>
        <Route path="/auth/session" element={<SessionBootstrapPage />} />
        <Route path="/dashboard" element={<div>Dashboard pronto</div>} />
      </Routes>
    </MemoryRouter>,
  );
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
