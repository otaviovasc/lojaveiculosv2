// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { act } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { BillingApi } from "./apiClient";
import { AppApiError } from "../../lib/apiErrors";
import { BillingModule } from "./BillingModule";
import { BillingActivationTimeline } from "./BillingSignupFlow";
import type {
  BillingOverview,
  BillingPlan,
  BillingProviderStatus,
  CreateBillingPlanHireInput,
} from "./types";

afterEach(() => {
  cleanup();
  window.sessionStorage.clear();
  window.history.replaceState({}, "", "/");
  vi.useRealTimers();
});

describe("BillingModule v3", () => {
  it("renders the five cumulative monthly plans and the Escala quote price", async () => {
    render(<BillingModule api={api()} />);
    for (const name of ["Free", "Essencial", "Operação", "Gestão", "Escala"]) {
      await screen.findAllByRole("radio");
      expect(planRadio(name)).toBeVisible();
    }
    expect(screen.getByText(/A partir de R\$ 897/)).toBeVisible();
    for (const quota of [
      "10 veículos · 1 usuário · 3 consultas de placa/mês",
      "75 veículos · 3 usuários · 25 consultas de placa/mês",
      "150 veículos · 5 usuários · 75 consultas de placa/mês",
      "300 veículos · 10 usuários · 150 consultas de placa/mês",
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

  it("polls beyond the first pending response and refreshes only after server activation", async () => {
    vi.useFakeTimers();
    window.sessionStorage.setItem(scopedHireKey, "hire_1");
    const billingApi = api();
    vi.mocked(billingApi.getPlanHire)
      .mockResolvedValueOnce(hire(plan("essencial", 2, 19_700).id))
      .mockResolvedValueOnce({
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
    expect(billingApi.getPlanHire).toHaveBeenCalledTimes(1);
    expect(billingApi.getOverview).toHaveBeenCalledTimes(1);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(1_500);
    });

    expect(billingApi.getPlanHire).toHaveBeenCalledTimes(2);
    expect(billingApi.getOverview).toHaveBeenCalledTimes(2);
    expect(window.sessionStorage.getItem(scopedHireKey)).toBeNull();
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
    capabilities: [],
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

function providerStatus(): BillingProviderStatus {
  return {
    configured: true,
    missingConfiguration: [],
    provider: "asaas",
    webhookConfigured: true,
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
