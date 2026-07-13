// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { BillingPlanComposition } from "./BillingPanels";
import type { BillingOverview } from "./types";

afterEach(cleanup);

describe("BillingPlanComposition", () => {
  it("separates the base plan from the priced CRM add-on", async () => {
    const user = userEvent.setup();
    const crm = {
      endsAt: null,
      featureKey: "crm",
      includedInPlan: false,
      limitValue: null,
      source: "trial",
      startsAt: null,
      status: "active",
    } as const;
    const overview = {
      addons: [
        {
          catalogVersion: "2026-07-v1",
          code: "crm_whatsapp_instance",
          featureKey: "crm",
          id: "addon_crm",
          includedInTrial: true,
          monthlyPriceCents: 24999,
          name: "CRM WhatsApp",
          status: "active",
        },
      ],
      allocations: [],
      authority: {
        currentActorCanManage: true,
        managedBy: "store_owner",
        managerLabel: "Dono da loja",
        ownerBillingAccess: "allowed",
        summary: "O dono gerencia a assinatura.",
      },
      chargePreview: {
        cadence: "monthly",
        collectionMethod: "card_on_file",
        collectionTiming: "cycle_end",
        currency: "BRL",
        hasAgencyDiscount: false,
        lineItems: [],
        prorationPolicy: "store_days_active",
        subtotalCents: 29900,
        totalCents: 29900,
      },
      entitlementEvents: [],
      entitlementMatrix: [crm],
      entitlements: [],
      financialSummary: {
        monthlyRecurringCents: 29900,
        nextDueAt: null,
        openInvoiceCount: 0,
        overdueInvoiceCount: 0,
        paidThisPeriodCents: 0,
      },
      plans: [],
      storeId: "store_1",
      subscription: null,
      tenantId: "tenant_1",
    } satisfies BillingOverview;

    render(
      <BillingPlanComposition
        canManage
        overview={overview}
        onReasonChange={vi.fn()}
        onUpdate={vi.fn().mockResolvedValue(undefined)}
        reasons={{}}
        savingFeatureKey={null}
      />,
    );

    expect(screen.getByRole("heading", { name: "CRM" })).toBeVisible();
    expect(screen.getByText(/R\$\s249,99\/mês/)).toBeVisible();
    await user.click(screen.getByRole("button", { name: "Ver detalhes" }));

    expect(
      screen.getByRole("dialog", { name: "Seu pacote CRM" }),
    ).toBeVisible();
    expect(screen.getAllByText(/R\$\s249,99\/mês/)).toHaveLength(2);
    expect(
      screen.getByText(/Nenhum recurso é liberado sem o item correspondente/),
    ).toBeVisible();
  });
});
