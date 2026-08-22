// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { SessionBootstrap } from "../account/apiClient";
import { AccountSessionProvider } from "../account/accountSession";
import { SimulationsPage } from "./SimulationsPage";
import type { CredereApi } from "./apiClient";

describe("SimulationsPage direct owner Credere panel", () => {
  afterEach(cleanup);

  it("shows direct-owner connection controls and maps the current store", async () => {
    const api = createApi();
    const user = userEvent.setup();
    renderPage(
      api,
      session({ billingManagedBy: "store_owner", role: "owner" }),
    );

    expect(await screen.findByText("Credere da loja")).toBeVisible();
    await user.click(
      screen.getByRole("button", { name: "Listar lojas Credere" }),
    );

    const storeSelector = await screen.findByLabelText("Loja Credere");
    expect(storeSelector).toBeVisible();
    await user.click(storeSelector);
    expect(
      await screen.findByRole("option", { name: "Credere Centro" }),
    ).toBeVisible();

    await user.click(
      screen.getByRole("button", { name: "Vincular loja Credere" }),
    );

    await waitFor(() =>
      expect(api.mapStore).toHaveBeenCalledWith("external_1"),
    );
    expect(api.listProviderStores).toHaveBeenCalledTimes(1);
  });

  it("hides direct-owner controls for agency-managed store owners", async () => {
    const api = createApi();
    renderPage(api, session({ billingManagedBy: "agency", role: "owner" }));

    await screen.findByText("Integração Credere não configurada");

    expect(screen.queryByText("Credere da loja")).not.toBeInTheDocument();
    expect(api.getConnection).not.toHaveBeenCalled();
    expect(api.listProviderStores).not.toHaveBeenCalled();
  });

  it("hides direct-owner controls for store employees", async () => {
    const api = createApi();
    renderPage(
      api,
      session({ billingManagedBy: "store_owner", role: "salesman" }),
    );

    await screen.findByText("Integração Credere não configurada");

    expect(screen.queryByText("Credere da loja")).not.toBeInTheDocument();
    expect(api.getConnection).not.toHaveBeenCalled();
    expect(api.listProviderStores).not.toHaveBeenCalled();
  });

  it("hides direct-owner controls when owner billing metadata is missing", async () => {
    const api = createApi();
    renderPage(api, session({ billingManagedBy: undefined, role: "owner" }));

    await screen.findByText("Integração Credere não configurada");

    expect(screen.queryByText("Credere da loja")).not.toBeInTheDocument();
    expect(api.getConnection).not.toHaveBeenCalled();
    expect(api.listProviderStores).not.toHaveBeenCalled();
  });
});

function renderPage(api: CredereApi, value: SessionBootstrap) {
  return render(
    <AccountSessionProvider session={value}>
      <SimulationsPage api={api} />
    </AccountSessionProvider>,
  );
}

function createApi(): CredereApi {
  return {
    createSimulation: vi.fn(),
    disconnectConnection: vi.fn(async () => ({ ok: true })),
    getConnection: vi.fn(async () => ({
      connected: true,
      configured: true,
      storeMapping: {
        externalStoreAlias: "Credere Centro",
        externalStoreId: "external_1",
      },
    })),
    getRequiredFields: vi.fn(),
    getSimulation: vi.fn(),
    getStatus: vi.fn(async () => ({
      configured: false,
      mappedStoreAlias: null,
      unavailableBanks: [],
      usableBanks: [],
    })),
    listProviderStores: vi.fn(async () => [
      {
        externalStoreId: "external_1",
        name: "Credere Centro",
      },
    ]),
    listSimulations: vi.fn(async () => []),
    mapStore: vi.fn(async () => ({
      externalStoreAlias: "Credere Centro",
      externalStoreId: "external_1",
    })),
    refreshSimulation: vi.fn(),
    resolveFipeVehicle: vi.fn(async () => ({
      candidates: [] as [],
      status: "not_found" as const,
    })),
    startOAuth: vi.fn(async () => ({
      authorizationUrl: "https://credere.example/auth",
    })),
    syncSimulations: vi.fn(async () => ({
      created: 0,
      remoteCount: 0,
      skipped: 0,
      syncedAt: null,
      updated: 0,
    })),
    unmapStore: vi.fn(async () => ({ ok: true })),
  };
}

function session(input: {
  billingManagedBy?: "agency" | "store_owner" | undefined;
  role: string;
}): SessionBootstrap {
  const store = {
    effectivePermissions: ["sale.read"],
    entitlements: ["simulations"],
    role: input.role,
    status: "active" as const,
    storeId: "store_1",
    storeName: "Loja Centro",
    storeSlug: "loja-centro",
    tenantId: "tenant_1",
    tenantName: "Tenant Centro",
    ...(input.billingManagedBy
      ? { billingManagedBy: input.billingManagedBy }
      : {}),
  };
  return {
    defaultStore: store,
    needsOnboarding: false,
    platformAdmin: false,
    stores: [store],
    tenantMemberships: [],
    user: {
      clerkUserId: "clerk_user",
      email: "owner@example.com",
      id: "user_1",
      name: "Operador",
    },
  };
}
