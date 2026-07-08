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

  it("allows store access from an active managed store when no default store exists", async () => {
    bootstrap.mockResolvedValue(sessionWithManagedStore());

    renderGate(
      vi.fn(async () => "token-1"),
      "store",
    );

    expect(await screen.findByText("Onboarding pronto")).toBeInTheDocument();
  });
});

function renderGate(
  getToken: () => Promise<string | null>,
  access: "agency" | "onboarding" | "platform" | "store" = "onboarding",
) {
  return render(
    <MemoryRouter>
      <AccountAccessGate access={access} getToken={getToken} userId="user_1">
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

function sessionWithManagedStore(): SessionBootstrap {
  return {
    defaultStore: null,
    needsOnboarding: false,
    platformAdmin: false,
    stores: [
      {
        effectivePermissions: ["inventory.read"],
        role: "agency",
        status: "active",
        storeId: "store_1",
        storeName: "Loja Teste",
        storeSlug: "test-store",
        tenantId: "tenant_1",
        tenantName: "Agencia",
      },
    ],
    tenantMemberships: [
      {
        role: "agency",
        status: "active",
        tenantId: "tenant_1",
        tenantName: "Agencia",
        tenantSlug: "agencia",
      },
    ],
    user: {
      clerkUserId: "user_1",
      email: "agency@example.com",
      id: "identity_user_1",
      name: "Agency",
    },
  };
}
