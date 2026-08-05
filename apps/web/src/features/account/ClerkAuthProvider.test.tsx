// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { MemoryRouter, useLocation } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";

import type * as AuthConfigModule from "./authConfig";

const clerk = vi.hoisted(() => ({
  provider: vi.fn(({ children }: { children: ReactNode }) => children),
}));

vi.mock("@clerk/react-router", () => ({
  ClerkProvider: clerk.provider,
}));

vi.mock("./authConfig", async (importOriginal) => {
  const original = await importOriginal<typeof AuthConfigModule>();
  return {
    ...original,
    readClerkAuthConfig: () => ({
      configured: true,
      localAuthBypass: false,
      publishableKey: "pk_test_example",
      sessionPath: "/auth/session",
      signInPath: "/sign-in",
      signUpPath: "/sign-up",
    }),
  };
});

import { ClerkAuthProvider } from "./ClerkAuthProvider";

describe("ClerkAuthProvider", () => {
  afterEach(() => {
    cleanup();
    clerk.provider.mockClear();
  });

  it("uses Clerk's React Router provider with non-recursive fallbacks", () => {
    render(
      <MemoryRouter initialEntries={["/sign-in"]}>
        <ClerkAuthProvider>
          <LocationProbe />
        </ClerkAuthProvider>
      </MemoryRouter>,
    );

    const props = clerk.provider.mock.calls.at(-1)?.[0];
    expect(props).toEqual(
      expect.objectContaining({
        publishableKey: "pk_test_example",
        signInFallbackRedirectUrl: "/auth/session",
        signInUrl: "/sign-in",
        signUpFallbackRedirectUrl: "/auth/session",
      }),
    );
    expect(props).not.toHaveProperty("signInForceRedirectUrl");
    expect(props).not.toHaveProperty("signUpForceRedirectUrl");
    expect(props).not.toHaveProperty("signUpUrl");
    expect(props).not.toHaveProperty("routerPush");
    expect(props).not.toHaveProperty("routerReplace");
    expect(screen.getByTestId("location")).toHaveTextContent("/sign-in");
  });
});

function LocationProbe() {
  const location = useLocation();
  return <div data-testid="location">{location.pathname}</div>;
}
