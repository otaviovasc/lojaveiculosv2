// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter } from "react-router-dom";
import { AccountAccessGate } from "./AccountAccessGate";
import type { SessionBootstrap } from "./apiClient";

const bootstrap = vi.fn();
const createRuntimeAccountApi = vi.fn(async () => ({ bootstrap }));

vi.mock("./runtimeApi", () => ({
  createRuntimeAccountApi: () => createRuntimeAccountApi(),
}));

describe("AccountAccessGate", () => {
  afterEach(() => {
    cleanup();
    bootstrap.mockReset();
    createRuntimeAccountApi.mockClear();
  });

  it("does not refetch bootstrap only because Clerk getToken identity changed", async () => {
    bootstrap.mockResolvedValue(sessionNeedingOnboarding());

    const { rerender } = renderGate(vi.fn(async () => "token-1"));

    expect(await screen.findByText("Onboarding pronto")).toBeInTheDocument();
    expect(bootstrap).toHaveBeenCalledTimes(1);

    rerender(
      <MemoryRouter>
        <AccountAccessGate
          access="onboarding"
          getToken={vi.fn(async () => "token-2")}
          userId="user_1"
        >
          <div>Onboarding pronto</div>
        </AccountAccessGate>
      </MemoryRouter>,
    );

    await waitFor(() => expect(bootstrap).toHaveBeenCalledTimes(1));
  });
});

function renderGate(getToken: () => Promise<string | null>) {
  return render(
    <MemoryRouter>
      <AccountAccessGate
        access="onboarding"
        getToken={getToken}
        userId="user_1"
      >
        <div>Onboarding pronto</div>
      </AccountAccessGate>
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
