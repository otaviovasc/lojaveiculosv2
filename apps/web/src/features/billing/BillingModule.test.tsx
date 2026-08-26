// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { act } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { BillingApi } from "./apiClient";
import { AppApiError } from "../../lib/apiErrors";
import { BillingModule } from "./BillingModule";
import { BillingActivationTimeline } from "./BillingSignupFlow";
import { AccountSessionProvider } from "../account/accountSession";
import type { SessionBootstrap } from "../account/apiClient";
import type {
  BillingOverview,
  BillingPlan,
  BillingProviderStatus,
  CreateBillingPlanHireInput,
} from "./types";

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  window.sessionStorage.clear();
  window.localStorage.clear();
  window.history.replaceState({}, "", "/");
  vi.useRealTimers();
});

describe("BillingModule v3", () => {
  it("offers only paid plans and shows Free in the current-plan section", async () => {
    render(<BillingModule api={api()} />);
    const planOptions = await screen.findAllByRole("radio");
    expect(planOptions).toHaveLength(4);
    for (const name of ["Essencial", "Operação", "Gestão", "Escala"]) {
      expect(planRadio(name)).toBeVisible();
    }
    expect(
      planOptions.some(
        (option) => option.querySelector("strong")?.textContent === "Free",
      ),
    ).toBe(false);
    const currentPlan = screen.getByRole("region", {
      name: "Seu plano atual",
    });
    expect(within(currentPlan).getByText("Free")).toBeVisible();
    expect(
      within(currentPlan).getByText("Construtor completo da vitrine"),
    ).toBeVisible();
    expect(
      within(currentPlan).getByText("Até 10 veículos em estoque"),
    ).toBeVisible();
    expect(screen.getByText(/A partir de R\$ 897/)).toBeVisible();
    expect(screen.getByText("CRM completo")).toBeVisible();
    expect(screen.getByText("AI Studio")).toBeVisible();
    for (const quota of [
      "Até 10 veículos em estoque",
      "Até 75 veículos em estoque",
      "Até 150 veículos em estoque",
      "Até 300 veículos em estoque",
      "3 consultas de placa/mês",
      "25 consultas de placa/mês",
      "75 consultas de placa/mês",
      "150 consultas de placa/mês",
    ]) {
      expect(screen.getByText(quota)).toBeVisible();
    }
    expect(
      screen.queryByText(/anual|teste gratuito|módulos extras/i),
    ).not.toBeInTheDocument();
  });

  it("keeps the overview visible and blocks paid hiring when provider readiness fails", async () => {
    const billingApi = api();
    billingApi.getProviderStatus = vi
      .fn()
      .mockRejectedValue(new Error("offline"));
    render(<BillingModule api={billingApi} />);
    await screen.findAllByRole("radio");
    fireEvent.click(planRadio("Essencial"));
    expect(
      screen.getByRole("button", { name: "Continuar para pagamento" }),
    ).toBeDisabled();
    expect(screen.getByText(/resumo continua disponível/i)).toBeVisible();
  });

  it("shows an actionable billing error with its request id", async () => {
    const billingApi = api();
    vi.mocked(billingApi.createPlanHire).mockRejectedValueOnce(
      new AppApiError({
        message: "Provider unavailable",
        requestId: "req_billing_123",
        status: 503,
      }),
    );
    render(<BillingModule api={billingApi} />);
    await screen.findAllByRole("radio");
    fireEvent.click(planRadio("Essencial"));
    fireEvent.click(
      screen.getByRole("button", { name: "Continuar para pagamento" }),
    );

    expect(await screen.findByText(/req_billing_123/)).toHaveTextContent(
      /Tente novamente.*suporte/i,
    );
  });

  it("reuses the store and plan idempotency key after a lost response", async () => {
    const billingApi = api();
    vi.mocked(billingApi.createPlanHire)
      .mockRejectedValueOnce(new Error("lost response"))
      .mockResolvedValueOnce(hire(plan("essencial", 2, 19_700).id));
    render(<BillingModule api={billingApi} />);
    await screen.findAllByRole("radio");
    fireEvent.click(planRadio("Essencial"));
    fireEvent.click(
      screen.getByRole("button", { name: "Continuar para pagamento" }),
    );
    await screen.findByText(/lost response/i);

    const firstInput = vi.mocked(billingApi.createPlanHire).mock.calls[0]?.[0];
    expect(firstInput?.idempotencyKey).toBeTruthy();
    expect(window.sessionStorage.getItem(essentialIdempotencyKey)).toBe(
      firstInput?.idempotencyKey,
    );

    fireEvent.click(
      screen.getByRole("button", { name: "Continuar para pagamento" }),
    );
    await waitFor(() =>
      expect(billingApi.createPlanHire).toHaveBeenCalledTimes(2),
    );
    expect(
      vi.mocked(billingApi.createPlanHire).mock.calls[1]?.[0].idempotencyKey,
    ).toBe(firstInput?.idempotencyKey);
  });

  it("keeps a mount-local idempotency key when session storage is blocked", async () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("storage blocked");
    });
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("storage blocked");
    });
    const billingApi = api();
    vi.mocked(billingApi.createPlanHire)
      .mockRejectedValueOnce(new Error("lost response"))
      .mockResolvedValueOnce(hire(plan("essencial", 2, 19_700).id));
    render(<BillingModule api={billingApi} />);
    await screen.findAllByRole("radio");
    fireEvent.click(planRadio("Essencial"));
    fireEvent.click(
      screen.getByRole("button", { name: "Continuar para pagamento" }),
    );
    await screen.findByText(/lost response/i);
    fireEvent.click(
      screen.getByRole("button", { name: "Continuar para pagamento" }),
    );
    await waitFor(() =>
      expect(billingApi.createPlanHire).toHaveBeenCalledTimes(2),
    );
    expect(
      vi.mocked(billingApi.createPlanHire).mock.calls[0]?.[0].idempotencyKey,
    ).toBe(
      vi.mocked(billingApi.createPlanHire).mock.calls[1]?.[0].idempotencyKey,
    );
  });

  it("creates a durable hire and requests an Escala quote", async () => {
    const billingApi = api();
    vi.mocked(billingApi.createPlanHire).mockResolvedValueOnce({
      ...hire(plan("essencial", 2, 19_700).id),
      activatedAt: new Date().toISOString(),
      completedAt: new Date().toISOString(),
      phase: "paid_active",
      status: "paid_active",
    });
    render(<BillingModule api={billingApi} />);
    await screen.findAllByRole("radio");
    fireEvent.click(planRadio("Essencial"));
    fireEvent.click(
      screen.getByRole("button", { name: "Continuar para pagamento" }),
    );
    await waitFor(() =>
      expect(billingApi.createPlanHire).toHaveBeenCalledWith(
        expect.objectContaining({ planId: plan("essencial", 2, 19_700).id }),
      ),
    );
    fireEvent.click(planRadio("Escala"));
    fireEvent.click(screen.getByRole("button", { name: "Solicitar proposta" }));
    await waitFor(() => expect(billingApi.requestPlanQuote).toHaveBeenCalled());
  });

  it("prevents a duplicate Escala quote request in the current store session", async () => {
    const billingApi = api();
    render(<BillingModule api={billingApi} />);
    await screen.findAllByRole("radio");
    fireEvent.click(planRadio("Escala"));
    fireEvent.click(screen.getByRole("button", { name: "Solicitar proposta" }));

    const requested = await screen.findByRole("button", {
      name: "Proposta já solicitada",
    });
    expect(requested).toBeDisabled();
    fireEvent.click(requested);
    expect(billingApi.requestPlanQuote).toHaveBeenCalledTimes(1);
  });

  it("disables the effective plan and explains renewal-time paid plan changes", async () => {
    const billingApi = api();
    vi.mocked(billingApi.getOverview).mockResolvedValue(paidOverview());
    render(<BillingModule api={billingApi} />);
    await screen.findAllByRole("radio");

    expect(planRadio("Essencial")).toBeEnabled();
    expect(screen.getAllByText("Plano atual")).toHaveLength(2);
    expect(screen.getByRole("button", { name: "Plano atual" })).toBeDisabled();
    fireEvent.click(planRadio("Operação"));
    expect(
      screen.getByText(/mudança para Operação.*próxima renovação/i),
    ).toBeVisible();
    expect(
      screen.getByRole("button", { name: "Agendar mudança" }),
    ).toBeEnabled();

    fireEvent.click(planRadio("Escala"));
    expect(screen.getByText(/depende de uma proposta aprovada/i)).toBeVisible();
    expect(
      screen.getByRole("button", { name: "Solicitar proposta" }),
    ).toBeEnabled();
  });

  it("shows the effective paid plan without exposing Free as a downgrade card", async () => {
    const billingApi = api();
    vi.mocked(billingApi.getOverview).mockResolvedValue(paidOverview());
    render(<BillingModule api={billingApi} />);
    const planOptions = await screen.findAllByRole("radio");
    expect(
      planOptions.some(
        (option) => option.querySelector("strong")?.textContent === "Free",
      ),
    ).toBe(false);
    const currentPlan = screen.getByRole("region", {
      name: "Seu plano atual",
    });
    expect(within(currentPlan).getByText("Essencial")).toBeVisible();
    expect(within(currentPlan).getByText("Domínio próprio")).toBeVisible();
    expect(within(currentPlan).getByText("Reservas e vendas")).toBeVisible();
    fireEvent.click(
      within(currentPlan).getByRole("button", {
        name: "Agendar mudança para Free",
      }),
    );
    await waitFor(() =>
      expect(billingApi.createPlanHire).toHaveBeenCalledWith(
        expect.objectContaining({ planId: plan("free", 1, 0).id }),
      ),
    );
  });

  it("blocks the discreet Free downgrade action when provider readiness fails", async () => {
    const billingApi = api();
    vi.mocked(billingApi.getOverview).mockResolvedValue(paidOverview());
    vi.mocked(billingApi.getProviderStatus).mockRejectedValueOnce(
      new Error("offline"),
    );
    render(<BillingModule api={billingApi} />);
    const currentPlan = await screen.findByRole("region", {
      name: "Seu plano atual",
    });
    expect(
      within(currentPlan).getByRole("button", {
        name: "Agendar mudança para Free",
      }),
    ).toBeDisabled();
  });

  it("uses a warning billing-phase pill when reconciliation is required", async () => {
    const billingApi = api();
    vi.mocked(billingApi.getOverview).mockResolvedValue({
      ...overview(),
      billingPhase: "reconciliation_failed",
    });
    render(<BillingModule api={billingApi} />);

    const copy = await screen.findByText(/Free · conciliação necessária/i);
    expect(copy).toHaveClass("bg-warning-soft", "text-warning-strong");
    expect(copy.querySelector(".lucide-circle-alert")).toBeInTheDocument();
  });

  it("polls beyond the first pending response and refreshes only after server activation", async () => {
    vi.useFakeTimers();
    window.sessionStorage.setItem(scopedHireKey, "hire_1");
    window.sessionStorage.setItem(essentialIdempotencyKey, "stable_key");
    const billingApi = api();
    const refreshSession = vi.fn(async () => true);
    vi.mocked(billingApi.getOverview)
      .mockResolvedValueOnce(overview())
      .mockResolvedValueOnce(paidOverview());
    vi.mocked(billingApi.getPlanHire)
      .mockResolvedValueOnce(hire(plan("essencial", 2, 19_700).id))
      .mockResolvedValueOnce({
        ...hire(plan("essencial", 2, 19_700).id),
        activatedAt: new Date().toISOString(),
        completedAt: new Date().toISOString(),
        phase: "paid_active",
        status: "paid_active",
      });

    render(
      <AccountSessionProvider
        refreshSession={refreshSession}
        session={billingSession()}
      >
        <BillingModule api={billingApi} />
      </AccountSessionProvider>,
    );
    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });
    expect(billingApi.getPlanHire).toHaveBeenCalledTimes(1);
    expect(billingApi.getOverview).toHaveBeenCalledTimes(1);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(1_500);
    });

    expect(billingApi.getPlanHire).toHaveBeenCalledTimes(2);
    expect(billingApi.getOverview).toHaveBeenCalledTimes(2);
    expect(refreshSession).toHaveBeenCalledTimes(1);
    expect(window.sessionStorage.getItem(scopedHireKey)).toBeNull();
    expect(window.sessionStorage.getItem(essentialIdempotencyKey)).toBeNull();

    const dialog = screen.getByRole("dialog", {
      name: "Plano Essencial ativado",
    });
    expect(dialog).toHaveTextContent(/pagamento foi confirmado/i);
    expect(within(dialog).getByText("Domínio próprio")).toBeVisible();
    expect(within(dialog).getByText("Reservas e vendas")).toBeVisible();
    expect(within(dialog).getByText(/75 veículos em estoque/)).toBeVisible();

    fireEvent.click(
      within(dialog).getByRole("button", { name: "Explorar recursos" }),
    );
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(
      window.localStorage.getItem(
        "lojaveiculos.billing.activation-seen.tenant_1.store_1.hire_1",
      ),
    ).toBe("seen");
  });

  it("does not reopen an activation already acknowledged in this browser", async () => {
    vi.useFakeTimers();
    window.sessionStorage.setItem(scopedHireKey, "hire_1");
    window.localStorage.setItem(
      "lojaveiculos.billing.activation-seen.tenant_1.store_1.hire_1",
      "seen",
    );
    const billingApi = api();
    vi.mocked(billingApi.getOverview)
      .mockResolvedValueOnce(overview())
      .mockResolvedValueOnce(paidOverview());
    vi.mocked(billingApi.getPlanHire).mockResolvedValueOnce({
      ...hire(plan("essencial", 2, 19_700).id),
      activatedAt: new Date().toISOString(),
      completedAt: new Date().toISOString(),
      phase: "paid_active",
      status: "paid_active",
    });

    render(<BillingModule api={billingApi} />);
    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("ignores a spoofed callback hire id and polls the persisted hire", async () => {
    window.history.replaceState({}, "", "/billing?hireId=spoofed_hire");
    window.sessionStorage.setItem(scopedHireKey, "trusted_hire");
    const billingApi = api();
    render(<BillingModule api={billingApi} />);
    await waitFor(() =>
      expect(billingApi.getPlanHire).toHaveBeenCalledWith("trusted_hire"),
    );
    expect(billingApi.getPlanHire).not.toHaveBeenCalledWith("spoofed_hire");
  });

  it("migrates a matching legacy callback hire into the current store scope", async () => {
    window.history.replaceState({}, "", "/billing?hireId=legacy_hire");
    window.sessionStorage.setItem(
      "lojaveiculos.billing.active-hire",
      "legacy_hire",
    );
    const billingApi = api();
    render(<BillingModule api={billingApi} />);

    await waitFor(() =>
      expect(billingApi.getPlanHire).toHaveBeenCalledWith("legacy_hire"),
    );
    expect(window.sessionStorage.getItem(scopedHireKey)).toBe("legacy_hire");
    expect(
      window.sessionStorage.getItem("lojaveiculos.billing.active-hire"),
    ).toBeNull();
  });

  it("cleans an unscoped legacy hire instead of polling it in another store", async () => {
    window.sessionStorage.setItem(
      "lojaveiculos.billing.active-hire",
      "hire_from_another_store",
    );
    const billingApi = api();
    render(<BillingModule api={billingApi} />);
    await screen.findAllByRole("radio");

    expect(billingApi.getPlanHire).not.toHaveBeenCalled();
    expect(
      window.sessionStorage.getItem("lojaveiculos.billing.active-hire"),
    ).toBeNull();
    expect(window.sessionStorage.getItem(scopedHireKey)).toBeNull();
  });

  it("does not surface a rejected action after its API generation is stale", async () => {
    const firstApi = api();
    const rejected = deferred<void>();
    vi.mocked(firstApi.createPlanHire).mockImplementationOnce(async () => {
      await rejected.promise;
      throw new Error("stale billing failure");
    });
    const { rerender } = render(<BillingModule api={firstApi} />);
    await screen.findAllByRole("radio");
    fireEvent.click(planRadio("Essencial"));
    fireEvent.click(
      screen.getByRole("button", { name: "Continuar para pagamento" }),
    );

    rerender(<BillingModule api={api()} />);
    await act(async () => rejected.resolve());

    expect(
      screen.queryByText(/stale billing failure/i),
    ).not.toBeInTheDocument();
  });

  it.each([
    ["cancelled", "Checkout cancelado"],
    ["expired", "Checkout expirado"],
    ["failed", "A contratação falhou"],
    ["reconciliation_failed", "precisa de conciliação"],
  ] as const)("renders the accessible %s activation state", (status, copy) => {
    render(
      <BillingActivationTimeline
        hire={{ ...hire(plan("essencial", 2, 19_700).id), status }}
      />,
    );
    expect(screen.getByRole("status")).toHaveTextContent(copy);
  });
});

const scopedHireKey = "lojaveiculos.billing.active-hire.tenant_1.store_1";
const essentialIdempotencyKey =
  "lojaveiculos.billing.plan-hire-idempotency.tenant_1.store_1.83262608-0000-4000-8000-000000000002";

function api(): BillingApi {
  return {
    createPlanHire: vi.fn(async (input: CreateBillingPlanHireInput) =>
      hire(input.planId),
    ),
    getPlanHire: vi.fn(async () => hire(plan("essencial", 2, 19_700).id)),
    getOverview: vi.fn(async () => overview()),
    getProviderStatus: vi.fn(async () => providerStatus()),
    requestPlanQuote: vi.fn(async (planId: string) => ({
      catalogVersion: "2026-08-v3",
      expiresAt: null,
      id: "quote_1",
      planId,
      quotedCents: null,
      status: "requested" as const,
      storeId: "store_1",
      tenantId: "tenant_1",
    })),
  };
}

function planRadio(name: string) {
  const match = screen
    .getAllByRole("radio")
    .find((element) => element.querySelector("strong")?.textContent === name);
  if (!match) throw new Error(`Plan ${name} not found.`);
  return match;
}

function overview(): BillingOverview {
  return {
    allocations: [],
    authority: {
      currentActorCanManage: true,
      managedBy: "store_owner",
      managerLabel: "Dono",
      ownerBillingAccess: "allowed",
      summary: "",
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
    entitlementMatrix: [],
    entitlements: [],
    financialSummary: {
      monthlyRecurringCents: 0,
      nextDueAt: null,
      openInvoiceCount: 0,
      overdueInvoiceCount: 0,
      paidThisPeriodCents: 0,
    },
    plans: [
      plan("free", 1, 0),
      plan("essencial", 2, 19_700),
      plan("operacao", 3, 39_700),
      plan("gestao", 4, 59_700),
      plan("escala", 5, 89_700),
    ],
    storeId: "store_1",
    subscription: null,
    tenantId: "tenant_1",
  };
}

function paidOverview(): BillingOverview {
  const base = overview();
  const essential = base.plans.find(
    (candidate) => candidate.code === "essencial",
  )!;
  return {
    ...base,
    billingPhase: "paid_active",
    effectiveContract: {
      currentPeriodEnd: "2026-09-26T00:00:00.000Z",
      currentPeriodStart: "2026-08-26T00:00:00.000Z",
      planCode: essential.code,
      planId: essential.id,
      planName: essential.name,
      unitAmountCents: essential.monthlyPriceCents,
    },
    subscription: {
      currentPeriodEnd: "2026-09-26T00:00:00.000Z",
      currentPeriodStart: "2026-08-26T00:00:00.000Z",
      id: "subscription_paid",
      plan: essential,
      status: "active",
    },
  };
}

function plan(
  code: string,
  selectionRank: number,
  monthlyPriceCents: number,
): BillingPlan {
  const names: Record<string, string> = {
    free: "Free",
    essencial: "Essencial",
    operacao: "Operação",
    gestao: "Gestão",
    escala: "Escala",
  };
  const quotas: Record<string, [number | null, number | null, number | null]> =
    {
      essencial: [75, 3, 25],
      escala: [null, null, null],
      free: [10, 1, 3],
      gestao: [300, 10, 150],
      operacao: [150, 5, 75],
    };
  const [vehicleLimit, sellerLimit, plateLookupLimit] = quotas[code] ?? [
    null,
    null,
    null,
  ];
  return {
    capabilities: planCapabilities[code] ?? [],
    catalogVersion: "2026-08-v3",
    checkoutMode:
      code === "free"
        ? "free"
        : code === "escala"
          ? "quote_required"
          : "checkout",
    code,
    features: [
      {
        featureKey: "plate_lookup",
        included: true,
        includedInTrial: false,
        limitValue: plateLookupLimit,
        trialLimitValue: null,
      },
    ],
    id: `83262608-0000-4000-8000-00000000000${selectionRank}`,
    limits: {
      sellerLimit,
      vehicleLimit,
    },
    monthlyPriceCents,
    name: names[code]!,
    selectionRank,
    status: "active",
  };
}

const planCapabilities: Readonly<Record<string, readonly string[]>> = {
  essencial: [
    "storefront_builder",
    "vehicle_listing_control",
    "public_interest_capture",
    "basic_lead_inbox",
    "custom_domain",
    "reservations_and_sales",
    "customers",
    "internal_financing_workflow",
    "connected_financing_when_verified",
  ],
  escala: [
    "storefront_builder",
    "vehicle_listing_control",
    "public_interest_capture",
    "basic_lead_inbox",
    "custom_domain",
    "reservations_and_sales",
    "customers",
    "internal_financing_workflow",
    "connected_financing_when_verified",
    "full_crm",
    "official_channels",
    "byok_zapi",
    "document_workspace",
    "document_templates",
    "fiscal",
    "finance",
    "commissions",
    "analytics",
    "compliance",
    "checklists",
    "finance_auto_entry_rules",
    "marketplaces",
    "public_api_and_webhooks",
    "advanced_automation",
    "ai_studio",
    "resale_analysis_ai",
  ],
  free: [
    "storefront_builder",
    "vehicle_listing_control",
    "public_interest_capture",
    "basic_lead_inbox",
  ],
  gestao: [
    "storefront_builder",
    "vehicle_listing_control",
    "public_interest_capture",
    "basic_lead_inbox",
    "custom_domain",
    "reservations_and_sales",
    "customers",
    "internal_financing_workflow",
    "connected_financing_when_verified",
    "full_crm",
    "official_channels",
    "byok_zapi",
    "document_workspace",
    "document_templates",
    "fiscal",
    "finance",
    "commissions",
    "analytics",
    "compliance",
    "checklists",
    "finance_auto_entry_rules",
  ],
  operacao: [
    "storefront_builder",
    "vehicle_listing_control",
    "public_interest_capture",
    "basic_lead_inbox",
    "custom_domain",
    "reservations_and_sales",
    "customers",
    "internal_financing_workflow",
    "connected_financing_when_verified",
    "full_crm",
    "official_channels",
    "byok_zapi",
    "document_workspace",
    "document_templates",
  ],
};

function providerStatus(): BillingProviderStatus {
  return {
    configured: true,
    missingConfiguration: [],
    provider: "asaas",
    webhookConfigured: true,
  };
}

function billingSession(): SessionBootstrap {
  return {
    defaultStore: {
      effectivePermissions: ["billing.manage"],
      entitlements: ["storefront", "inventory", "lead_capture"],
      role: "owner",
      status: "active",
      storeId: "store_1",
      storeName: "Loja Teste",
      storeSlug: "loja-teste",
      tenantId: "tenant_1",
      tenantName: "Loja Teste",
    },
    needsOnboarding: false,
    platformAdmin: false,
    stores: [],
    tenantMemberships: [],
    user: {
      clerkUserId: "clerk_user_1",
      email: "owner@example.com",
      id: "user_1",
      name: "Owner",
    },
  };
}

function hire(planId: string) {
  return {
    activatedAt: null,
    catalogVersion: "2026-08-v3",
    checkoutMode: "checkout" as const,
    checkoutUrl: null,
    completedAt: null,
    createdAt: new Date().toISOString(),
    failureCode: null,
    id: "hire_1",
    idempotencyKey: "idem_1",
    phase: "payment_pending" as const,
    planId,
    planSnapshot: { code: "essencial", name: "Essencial", selectionRank: 2 },
    providerCheckoutId: null,
    providerPaymentId: null,
    providerSubscriptionId: null,
    quotedCents: 19_700,
    status: "payment_pending" as const,
    storeId: "store_1",
    tenantId: "tenant_1",
    updatedAt: new Date().toISOString(),
  };
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((promiseResolve) => {
    resolve = promiseResolve;
  });
  return { promise, resolve };
}
