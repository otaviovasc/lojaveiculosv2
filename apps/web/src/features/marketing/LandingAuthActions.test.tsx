// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter } from "react-router-dom";
import { ClerkAuthProvider } from "../account/ClerkAuthProvider";
import { selectLocalDevAccount } from "../account/localDevAuth";
import { LandingAuthActions } from "./LandingAuthActions";

describe("LandingAuthActions", () => {
  afterEach(() => {
    cleanup();
    localStorage.clear();
    vi.unstubAllEnvs();
  });

  it("uses local auth links without Clerk hooks when bypass is enabled", () => {
    vi.stubEnv("VITE_LOCAL_AUTH_BYPASS", "true");
    vi.stubEnv("VITE_CLERK_PUBLISHABLE_KEY", "pk_test_local");
    selectLocalDevAccount("clerk_seed_owner");

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
