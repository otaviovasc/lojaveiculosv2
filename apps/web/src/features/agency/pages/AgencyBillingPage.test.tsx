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
import type {
  BillingPlanHire,
  BillingProviderStatus,
} from "../../billing/types";
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
    window.sessionStorage.clear();
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

  it("keeps the store overview visible when provider readiness fails", async () => {
    const api = createApi();
    vi.mocked(api.getProviderStatus).mockRejectedValueOnce(
      new Error("offline"),
    );
    render(
      <AccountSessionProvider session={session()}>
        <MemoryRouter initialEntries={["/agency/admin/unified-billing"]}>
          <AgencyBillingPage api={api} />
        </MemoryRouter>
      </AccountSessionProvider>,
    );

    expect(
      await screen.findByRole("heading", { name: "Loja Centro" }),
    ).toBeVisible();
    expect(screen.getByText(/resumo segue disponível/i)).toBeVisible();
    expect(
      screen.getByRole("button", { name: "Continuar para pagamento" }),
    ).toBeDisabled();
  });

  it("discards a hire response after the operator changes stores", async () => {
    const api = createApi();
    const pendingHire = deferred<BillingPlanHire>();
    vi.mocked(api.createStorePlanHire).mockReturnValueOnce(pendingHire.promise);
    render(
      <AccountSessionProvider session={session()}>
        <MemoryRouter initialEntries={["/agency/admin/unified-billing"]}>
          <AgencyBillingPage api={api} />
        </MemoryRouter>
      </AccountSessionProvider>,
    );

    await screen.findByRole("heading", { name: "Loja Centro" });
    fireEvent.click(
      screen.getByRole("button", { name: "Continuar para pagamento" }),
    );
    fireEvent.click(screen.getByRole("button", { name: "Loja selecionada" }));
    fireEvent.click(screen.getByRole("option", { name: "Loja Norte" }));
    await act(async () => pendingHire.resolve(planHire("store_center")));

    expect(
      screen.queryByRole("heading", { name: "Ativação da assinatura" }),
    ).not.toBeInTheDocument();
    expect(
      window.sessionStorage.getItem(
        "lojaveiculos.agency.billing.hire.tenant_agency.store_center",
      ),
    ).toBeNull();
  });
});

function LocationProbe() {
  const location = useLocation();
  return <output data-testid="location">{location.search}</output>;
}

function createApi(): AgencyApi {
  return {
    createStorePlanHire: vi.fn(),
    getStorePlanHire: vi.fn(),
    getOverview: vi.fn(async () => overview()),
    getProviderStatus: vi.fn(async () => providerStatus()),
    requestStorePlanQuote: vi.fn(),
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
    planCode: "operacao",
    planName: "Operação",
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

function planHire(storeId: string): BillingPlanHire {
  return {
    activatedAt: null,
    catalogVersion: "2026-08-v3",
    checkoutMode: "checkout",
    checkoutUrl: null,
    completedAt: null,
    createdAt: "2026-08-25T12:00:00.000Z",
    failureCode: null,
    id: "hire_center",
    idempotencyKey: "agency-hire-center",
    phase: "payment_pending",
    planId: "plan_operacao",
    planSnapshot: { code: "operacao", name: "Operação", selectionRank: 3 },
    providerCheckoutId: "checkout_center",
    providerPaymentId: null,
    providerSubscriptionId: null,
    quotedCents: 39_700,
    status: "payment_pending",
    storeId,
    tenantId: "tenant_agency",
    updatedAt: "2026-08-25T12:00:00.000Z",
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
