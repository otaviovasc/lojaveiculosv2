// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { useLocation, MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { SessionBootstrap } from "../../account/apiClient";
import { AccountSessionProvider } from "../../account/accountSession";
import type { BillingProviderStatus } from "../../billing/types";
import type {
  AgencyApi,
  AgencyManagedStoreOverview,
  AgencyTenantOverview,
} from "../apiClient";
import { AgencyBillingPage } from "./AgencyBillingPage";
import { createAgencyBillingOverview } from "./AgencyBillingPage.testFixtures";

describe("AgencyBillingPage", () => {
  afterEach(() => {
    cleanup();
    window.localStorage.clear();
  });

  it("opens the requested store and keeps later store changes in the route", async () => {
    const api = createApi();
    render(
      <AccountSessionProvider session={session()}>
        <MemoryRouter
          initialEntries={["/agency/admin/unified-billing?storeId=store_north"]}
        >
          <AgencyBillingPage api={api} />
          <LocationProbe />
        </MemoryRouter>
      </AccountSessionProvider>,
    );

    expect(
      await screen.findByRole("heading", { name: "Loja Norte" }),
    ).toBeVisible();
    expect(api.getOverview).toHaveBeenCalledWith("tenant_agency");

    fireEvent.click(screen.getByRole("button", { name: "Loja selecionada" }));
    fireEvent.click(screen.getByRole("option", { name: "Loja Centro" }));

    expect(screen.getByTestId("location")).toHaveTextContent(
      "?storeId=store_center",
    );
  });

  it("ignores an older agency response after the selected agency changes", async () => {
    const api = createApi();
    const center = deferred<AgencyTenantOverview>();
    const north = deferred<AgencyTenantOverview>();
    vi.mocked(api.getOverview).mockImplementation((tenantId) =>
      tenantId === "tenant_center" ? center.promise : north.promise,
    );
    render(
      <AccountSessionProvider session={multiAgencySession()}>
        <MemoryRouter initialEntries={["/agency/admin/unified-billing"]}>
          <AgencyBillingPage api={api} />
        </MemoryRouter>
      </AccountSessionProvider>,
    );

    await waitFor(() =>
      expect(api.getOverview).toHaveBeenCalledWith("tenant_center"),
    );
    fireEvent.click(
      screen.getByRole("button", { name: "Conta de agência ativa" }),
    );
    fireEvent.click(screen.getByRole("option", { name: "Agência Norte" }));
    await waitFor(() =>
      expect(api.getOverview).toHaveBeenCalledWith("tenant_north"),
    );

    await act(async () => {
      north.resolve(
        overview({
          stores: [store("store_north", "Loja Norte")],
          tenantId: "tenant_north",
        }),
      );
    });
    expect(
      await screen.findByRole("heading", { name: "Loja Norte" }),
    ).toBeVisible();

    await act(async () => {
      center.resolve(
        overview({
          stores: [store("store_center", "Loja Centro")],
          tenantId: "tenant_center",
        }),
      );
    });
    expect(
      screen.queryByRole("heading", { name: "Loja Centro" }),
    ).not.toBeInTheDocument();
  });
});

function LocationProbe() {
  const location = useLocation();
  return <output data-testid="location">{location.search}</output>;
}

function createApi(): AgencyApi {
  return {
    cancelStoreZapiRequest: vi.fn(),
    createCheckout: vi.fn(),
    getOverview: vi.fn(async () => overview()),
    getProviderStatus: vi.fn(async () => providerStatus()),
    requestStoreZapi: vi.fn(),
    syncProviderSubscription: vi.fn(),
    updateStoreEntitlement: vi.fn(),
    updateStoreSelection: vi.fn(),
  };
}

function overview({
  stores = [
    store("store_center", "Loja Centro"),
    store("store_north", "Loja Norte"),
  ],
  tenantId = "tenant_agency",
}: {
  stores?: AgencyManagedStoreOverview[];
  tenantId?: string;
} = {}): AgencyTenantOverview {
  const billing = createAgencyBillingOverview("active");
  return {
    addons: billing.addons,
    allocations: billing.allocations,
    authority: billing.authority,
    chargePreview: billing.chargePreview,
    entitlementEvents: billing.entitlementEvents,
    financialSummary: billing.financialSummary,
    plans: billing.plans,
    stores,
    subscription: billing.subscription,
    tenant: {
      tenantId,
      tenantName: "Agência Teste",
      tenantSlug: "agencia-teste",
    },
    tenantId,
  };
}

function store(storeId: string, storeName: string): AgencyManagedStoreOverview {
  return {
    activeEntitlementCount: 0,
    addonCount: 0,
    createdAt: "2026-08-01T12:00:00.000Z",
    entitlementCount: 0,
    entitlementMatrix: [],
    monthlyAmountCents: 54_899,
    planCode: "growth",
    planName: "Growth",
    storeId,
    storeName,
    storeSlug: storeName.toLocaleLowerCase("pt-BR").replaceAll(" ", "-"),
    subscriptionStatus: "active",
    vehicleCount: 0,
  };
}

function providerStatus(): BillingProviderStatus {
  return {
    configured: true,
    missingConfiguration: [],
    provider: "asaas",
    webhookConfigured: true,
  };
}

function session(): SessionBootstrap {
  return {
    defaultStore: null,
    needsOnboarding: false,
    platformAdmin: false,
    stores: [],
    tenantMemberships: [
      {
        role: "agency",
        status: "active",
        tenantId: "tenant_agency",
        tenantName: "Agência Teste",
        tenantSlug: "agencia-teste",
      },
    ],
    user: {
      clerkUserId: "clerk_agency",
      email: "agency@example.test",
      id: "user_agency",
      name: "Operador",
    },
  };
}

function multiAgencySession(): SessionBootstrap {
  return {
    ...session(),
    tenantMemberships: [
      {
        role: "agency",
        status: "active",
        tenantId: "tenant_center",
        tenantName: "Agência Centro",
        tenantSlug: "agencia-centro",
      },
      {
        role: "agency",
        status: "active",
        tenantId: "tenant_north",
        tenantName: "Agência Norte",
        tenantSlug: "agencia-norte",
      },
    ],
  };
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((promiseResolve) => {
    resolve = promiseResolve;
  });
  return { promise, resolve };
}
