// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter } from "react-router-dom";
import { ClerkAuthProvider } from "../account/ClerkAuthProvider";
import { selectLocalDevAccount } from "../account/localDevAuth";
import { LandingAuthActions } from "./LandingAuthActions";

const clerk = vi.hoisted(() => ({
  useUser: vi.fn(() => ({ isLoaded: true, isSignedIn: false })),
}));

vi.mock("@clerk/react-router", () => ({
  ClerkProvider: ({ children }: { children: ReactNode }) => children,
  SignInButton: ({
    children,
    fallbackRedirectUrl,
    mode,
    withSignUp,
  }: {
    children: ReactNode;
    fallbackRedirectUrl?: string;
    mode?: string;
    withSignUp?: boolean;
  }) => (
    <div
      data-fallback-redirect={fallbackRedirectUrl}
      data-mode={mode}
      data-with-sign-up={withSignUp ? "true" : "false"}
    >
      {children}
    </div>
  ),
  UserButton: () => null,
  useUser: clerk.useUser,
}));

describe("LandingAuthActions", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    cleanup();
    localStorage.clear();
    vi.unstubAllEnvs();
  });

  it("opens the unified Clerk modal from the landing primary action", () => {
    vi.stubEnv("VITE_LOCAL_AUTH_BYPASS", "false");
    vi.stubEnv("VITE_CLERK_PUBLISHABLE_KEY", "pk_test_local");

    render(
      <MemoryRouter>
        <ClerkAuthProvider>
          <LandingAuthActions primaryLabel="Começar" />
        </ClerkAuthProvider>
      </MemoryRouter>,
    );

    const primaryWrapper = screen
      .getByRole("button", { name: "Começar" })
      .closest("[data-mode]");
    expect(primaryWrapper).toHaveAttribute("data-mode", "modal");
    expect(primaryWrapper).toHaveAttribute("data-with-sign-up", "true");
    expect(primaryWrapper).toHaveAttribute(
      "data-fallback-redirect",
      "/auth/session",
    );

    const signInWrapper = screen
      .getByRole("button", { name: "Entrar" })
      .closest("[data-mode]");
    expect(signInWrapper).toHaveAttribute("data-mode", "modal");
    expect(signInWrapper).toHaveAttribute("data-with-sign-up", "false");
  });

  it("uses local auth links without Clerk hooks when bypass is enabled", () => {
    vi.stubEnv("VITE_LOCAL_AUTH_BYPASS", "true");
    vi.stubEnv("VITE_CLERK_PUBLISHABLE_KEY", "pk_test_local");
    selectLocalDevAccount("clerk_seed_owner");
    vi.stubEnv("VITE_DEV_CLERK_USER_ID", "");

    render(
      <MemoryRouter>
        <ClerkAuthProvider>
          <LandingAuthActions primaryLabel="Começar" />
        </ClerkAuthProvider>
      </MemoryRouter>,
    );

    expect(screen.getByRole("link", { name: "Abrir painel" })).toHaveAttribute(
      "href",
      "/auth/session",
    );
    expect(screen.getByRole("link", { name: "Trocar perfil" })).toHaveAttribute(
      "href",
      "/sign-in",
    );
  });
});
