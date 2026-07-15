// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { BillingTrialStatus } from "./BillingTrialStatus";
import type { BillingOverview } from "./types";

describe("BillingTrialStatus", () => {
  it("states that a fresh trial has no contracted plan or package", () => {
    render(<BillingTrialStatus overview={trialOverview()} />);

    expect(screen.getByText("Teste gratuito")).toBeVisible();
    expect(
      screen.getByText(/Nenhum plano ou pacote foi contratado/),
    ).toBeVisible();
    expect(screen.getByText("Relatórios")).toBeVisible();
    expect(screen.queryByText("CRM")).not.toBeInTheDocument();
  });

  it("directs an expired trial to the first billing flow", () => {
    const overview = trialOverview();
    overview.subscription = {
      ...overview.subscription!,
      currentPeriodEnd: "2026-07-01T00:00:00.000Z",
      status: "expired",
    };

    render(<BillingTrialStatus overview={overview} />);

    expect(screen.getByText("Teste encerrado")).toBeVisible();
    expect(
      screen.getByText(/Escolha sua assinatura para continuar/),
    ).toBeVisible();
    expect(screen.getByText(/primeira cobrança/)).toBeVisible();
  });
});

function trialOverview(): BillingOverview {
  return {
    addons: [],
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
    entitlementMatrix: [],
    entitlements: [
      {
        endsAt: "2099-08-01T00:00:00.000Z",
        featureKey: "analytics",
        metadata: {},
        source: "billing_catalog",
        startsAt: "2099-07-01T00:00:00.000Z",
        status: "trialing",
      },
    ],
    financialSummary: {
      monthlyRecurringCents: 0,
      nextDueAt: null,
      openInvoiceCount: 0,
      overdueInvoiceCount: 0,
      paidThisPeriodCents: 0,
    },
    plans: [],
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
