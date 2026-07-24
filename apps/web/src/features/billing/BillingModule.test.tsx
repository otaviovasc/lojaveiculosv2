// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import {
  cleanup,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { BillingApi } from "./apiClient";
import type * as BillingCheckoutReturn from "./billingCheckoutReturn";
import { redirectToCheckout } from "./billingCheckoutReturn";
import { BillingModule } from "./BillingModule";
import type {
  BillingAddon,
  BillingOverview,
  BillingPlan,
  BillingProviderStatus,
} from "./types";

vi.mock("./billingCheckoutReturn", async (importOriginal) => {
  const actual = await importOriginal<typeof BillingCheckoutReturn>();
  return { ...actual, redirectToCheckout: vi.fn() };
});

const growthPlan: BillingPlan = {
  catalogVersion: "2026-07-v1",
  code: "growth",
  features: [
    {
      featureKey: "crm",
      included: true,
      includedInTrial: true,
      limitValue: null,
    },
    {
      featureKey: "analytics",
      included: true,
      includedInTrial: true,
      limitValue: null,
    },
  ],
  id: "plan_growth",
  limits: { sellerLimit: 5, vehicleLimit: 100 },
  monthlyPriceCents: 29900,
  name: "Growth",
  status: "active",
};

const marketplaceAddon: BillingAddon = {
  catalogVersion: "2026-07-v1",
  code: "marketplace_extra",
  featureKey: "marketplace",
  id: "addon_marketplace",
  includedInTrial: false,
  monthlyPriceCents: 24999,
  name: "Marketplaces Extra",
  status: "active",
};

const providerReady: BillingProviderStatus = {
  configured: true,
  missingConfiguration: [],
  provider: "asaas",
  webhookConfigured: true,
};

let assignSpy: ReturnType<typeof vi.fn>;

beforeEach(() => {
  assignSpy = vi.mocked(redirectToCheckout);
  assignSpy.mockClear();
});

afterEach(() => {
  cleanup();
});

describe("BillingModule signup flow", () => {
  it("saves the selection and starts checkout with a single CTA on a trial store", async () => {
    const user = userEvent.setup();
    const api = createBillingApiStub(trialOverview(), providerReady);
    render(<BillingModule api={api} />);

    const planOption = await screen.findByRole("radio", { name: /Growth/ });
    await user.click(planOption);
    await user.click(
      screen.getByRole("button", { name: "Adicionar à escolha" }),
    );
    await user.click(
      within(screen.getByLabelText("Resumo mensal")).getByRole("button", {
        name: "Assinar agora",
      }),
    );

    await waitFor(() =>
      expect(api.updateSelection).toHaveBeenCalledWith({
        addonIds: ["addon_marketplace"],
        planId: "plan_growth",
      }),
    );
    expect(api.createCheckout).toHaveBeenCalledWith({
      billingTypes: ["CREDIT_CARD"],
      minutesToExpire: 90,
    });
    await waitFor(() =>
      expect(assignSpy).toHaveBeenCalledWith(
        "https://asaas.example/checkout/1",
      ),
    );
  });

  it("offers the update path with provider sync on a paid store", async () => {
    const user = userEvent.setup();
    const overview = trialOverview();
    overview.subscription = {
      currentPeriodEnd: "2099-08-01T00:00:00.000Z",
      currentPeriodStart: "2099-07-01T00:00:00.000Z",
      id: "subscription_1",
      plan: growthPlan,
      status: "active",
    };
    const api = createBillingApiStub(overview, providerReady);
    render(<BillingModule api={api} />);

    const summary = await screen.findByLabelText("Resumo mensal");
    await user.click(
      within(summary).getByRole("button", { name: "Atualizar assinatura" }),
    );

    await waitFor(() =>
      expect(api.updateSelection).toHaveBeenCalledWith({
        addonIds: [],
        planId: "plan_growth",
      }),
    );
    expect(api.syncProviderSubscription).toHaveBeenCalledWith({
      billingType: "CREDIT_CARD",
      nextDueDate: "2099-08-01",
      updatePendingPayments: false,
    });
    expect(api.createCheckout).toHaveBeenCalledOnce();
  });

  it("keeps the flow read-only when the agency manages billing", async () => {
    const overview = trialOverview();
    overview.authority = {
      currentActorCanManage: false,
      managedBy: "agency",
      managerLabel: "Agência",
      ownerBillingAccess: "blocked_by_agency",
      summary: "A agência gerencia a assinatura desta loja.",
    };
    const api = createBillingApiStub(overview, providerReady);
    render(<BillingModule api={api} />);

    await screen.findByRole("radio", { name: /Growth/ });

    expect(screen.getByRole("radio", { name: /Growth/ })).toBeDisabled();
    expect(
      screen.queryByRole("button", { name: "Assinar agora" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Atualizar assinatura" }),
    ).not.toBeInTheDocument();
    expect(
      screen.getAllByText(/Gerenciado pela agência/).length,
    ).toBeGreaterThan(0);
  });

  it("shows the pending state instead of checkout when the provider is not configured", async () => {
    const user = userEvent.setup();
    const api = createBillingApiStub(trialOverview(), {
      configured: false,
      missingConfiguration: ["ASAAS_API_KEY"],
      provider: "asaas",
      webhookConfigured: false,
    });
    render(<BillingModule api={api} />);

    await user.click(await screen.findByRole("radio", { name: /Growth/ }));

    const summary = screen.getByLabelText("Resumo mensal");
    const cta = within(summary).getByRole("button", {
      name: "Pagamento indisponível",
    });
    expect(cta).toBeDisabled();
    expect(screen.getByText(/Nenhuma cobrança foi feita/)).toBeVisible();
    expect(api.createCheckout).not.toHaveBeenCalled();
  });

  it("moves history and allocation details to the secondary tab", async () => {
    const user = userEvent.setup();
    const api = createBillingApiStub(trialOverview(), providerReady);
    render(<BillingModule api={api} />);

    await screen.findByRole("radio", { name: /Growth/ });
    expect(
      screen.queryByRole("heading", { name: "Histórico de recursos" }),
    ).not.toBeInTheDocument();

    await user.click(screen.getByRole("tab", { name: "Detalhes" }));

    expect(
      screen.getByRole("heading", { name: "Histórico de recursos" }),
    ).toBeVisible();
    expect(
      screen.getByRole("heading", { name: "Alocação por loja" }),
    ).toBeVisible();
  });
});

function trialOverview(): BillingOverview {
  return {
    addons: [marketplaceAddon],
    allocations: [],
    authority: {
      currentActorCanManage: true,
      managedBy: "store_owner",
      managerLabel: "Dono da loja",
      ownerBillingAccess: "allowed",
      summary: "Você gerencia a assinatura.",
    },
    chargePreview: {
      cadence: "monthly",
      collectionMethod: "card_on_file",
      collectionTiming: "cycle_end",
      currency: "BRL",
      hasAgencyDiscount: false,
      lineItems: [],
      prorationPolicy: "store_days_active",
      subtotalCents: 0,
      totalCents: 0,
    },
    entitlementEvents: [],
    entitlementMatrix: [
      {
        endsAt: null,
        featureKey: "marketplace",
        includedInPlan: false,
        limitValue: null,
        source: null,
        startsAt: null,
        status: "inactive",
      },
    ],
    entitlements: [],
    financialSummary: {
      monthlyRecurringCents: 0,
      nextDueAt: null,
      openInvoiceCount: 0,
      overdueInvoiceCount: 0,
      paidThisPeriodCents: 0,
    },
    plans: [growthPlan],
    storeId: "store_1",
    subscription: {
      currentPeriodEnd: "2099-08-01T00:00:00.000Z",
      currentPeriodStart: "2099-07-01T00:00:00.000Z",
      id: "subscription_1",
      plan: null,
      status: "trialing",
    },
    tenantId: "tenant_1",
  };
}

function createBillingApiStub(
  overview: BillingOverview,
  providerStatus: BillingProviderStatus,
): BillingApi {
  return {
    createCheckout: vi.fn().mockResolvedValue({
      checkoutUrl: "https://asaas.example/checkout/1",
      expiresAt: null,
      externalReference: "ref_1",
      provider: "asaas",
      providerCheckoutId: "chk_1",
      subscriptionId: "subscription_1",
    }),
    getOverview: vi.fn().mockResolvedValue(overview),
    getProviderStatus: vi.fn().mockResolvedValue(providerStatus),
    syncProviderSubscription: vi.fn().mockResolvedValue({}),
    updateEntitlement: vi.fn(),
    updateSelection: vi.fn().mockResolvedValue(overview),
  };
}
