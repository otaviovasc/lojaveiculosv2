// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { act, cleanup, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter } from "react-router-dom";
import { AccountAccessGate } from "./AccountAccessGate";
import type { SessionBootstrap } from "./apiClient";
import { SessionBootstrapHandoffProvider } from "./sessionBootstrapHandoff";
import { SESSION_BOOTSTRAP_TIMEOUT_MS } from "./sessionBootstrapLoader";

const bootstrap = vi.fn();
const createRuntimeAccountApi = vi.fn(async () => ({ bootstrap }));

vi.mock("./runtimeApi", () => ({
  createRuntimeAccountApi: () => createRuntimeAccountApi(),
}));

vi.mock("./UserAccountButton", () => ({
  UserAccountButton: () => null,
}));

describe("AccountAccessGate", () => {
  afterEach(() => {
    cleanup();
    bootstrap.mockReset();
    createRuntimeAccountApi.mockClear();
    vi.useRealTimers();
  });

  it("does not refetch bootstrap only because Clerk getToken identity changed", async () => {
    bootstrap.mockResolvedValue(sessionNeedingOnboarding());

    const { rerender } = renderGate(vi.fn(async () => "token-1"));

    expect(await screen.findByText("Onboarding pronto")).toBeInTheDocument();
    expect(bootstrap).toHaveBeenCalledTimes(1);

    rerender(
      <MemoryRouter>
        <SessionBootstrapHandoffProvider>
          <AccountAccessGate
            access="onboarding"
            getToken={vi.fn(async () => "token-2")}
            userId="user_1"
          >
            <div>Onboarding pronto</div>
          </AccountAccessGate>
        </SessionBootstrapHandoffProvider>
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

  it("shows an actionable state instead of loading forever when no access is active", async () => {
    bootstrap.mockResolvedValue(sessionWithInvitedStore());

    renderGate(
      vi.fn(async () => "token-1"),
      "onboarding",
    );

    expect(
      await screen.findByRole("heading", { name: "Acesso à loja pendente" }),
    ).toBeInTheDocument();
    expect(screen.queryByText("Carregando sua conta")).not.toBeInTheDocument();
  });

  it("replaces a stalled bootstrap with an actionable timeout", async () => {
    vi.useFakeTimers();
    bootstrap.mockImplementation(() => new Promise(() => undefined));

    renderGate(vi.fn(async () => "token-1"));
    await act(() => vi.advanceTimersByTimeAsync(SESSION_BOOTSTRAP_TIMEOUT_MS));

    expect(screen.getByRole("alert")).toHaveTextContent(
      "Não foi possível carregar sua conta",
    );
    expect(
      screen.getByRole("button", { name: "Tentar novamente" }),
    ).toBeInTheDocument();
    expect(screen.queryByText("Carregando sua conta")).not.toBeInTheDocument();
  });
});

function renderGate(
  getToken: () => Promise<string | null>,
  access: "agency" | "onboarding" | "platform" | "store" = "onboarding",
) {
  return render(
    <MemoryRouter>
      <SessionBootstrapHandoffProvider>
        <AccountAccessGate access={access} getToken={getToken} userId="user_1">
          <div>Onboarding pronto</div>
        </AccountAccessGate>
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

function sessionWithInvitedStore(): SessionBootstrap {
  return {
    defaultStore: null,
    needsOnboarding: false,
    platformAdmin: false,
    stores: [
      {
        effectivePermissions: [],
        role: "salesman",
        status: "invited",
        storeId: "store_1",
        storeName: "Loja Teste",
        storeSlug: "test-store",
        tenantId: "tenant_1",
        tenantName: "Loja Teste",
      },
    ],
    tenantMemberships: [],
    user: {
      clerkUserId: "user_1",
      email: "user@example.com",
      id: "identity_user_1",
      name: "User",
    },
  };
}
