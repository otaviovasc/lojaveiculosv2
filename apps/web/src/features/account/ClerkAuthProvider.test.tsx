// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

const clerkProvider = vi.hoisted(() =>
  vi.fn(({ children }: { children: ReactNode }) => children),
);

vi.mock("@clerk/react", () => ({
  ClerkProvider: clerkProvider,
}));

import { ClerkAuthProvider } from "./ClerkAuthProvider";

describe("ClerkAuthProvider", () => {
  afterEach(() => {
    cleanup();
    clerkProvider.mockClear();
    vi.unstubAllEnvs();
  });

  it("globally forces every Clerk auth completion through session bootstrap", () => {
    vi.stubEnv("VITE_CLERK_PUBLISHABLE_KEY", "pk_test");

    render(
      <ClerkAuthProvider>
        <div>Protected app</div>
      </ClerkAuthProvider>,
    );

    expect(screen.getByText("Protected app")).toBeInTheDocument();
    expect(clerkProvider.mock.calls[0]?.[0]).toEqual(
      expect.objectContaining({
        signInForceRedirectUrl: "/auth/session",
        signUpForceRedirectUrl: "/auth/session",
      }),
    );
  });
});
