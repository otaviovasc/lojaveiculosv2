import { expect, test, type Page } from "@playwright/test";
import { installLocalSession } from "./support/auth";
import { qaPersonas } from "./support/personas";
import { saveQaScreenshot } from "./support/artifacts";
import { setQaViewport } from "./support/viewports";

test.describe("billing automatic monthly charge", () => {
  test("shows agency-managed automatic billing with proportional store lines", async ({
    page,
  }, testInfo) => {
    await setQaViewport(page, "desktop");
    await installLocalSession(page, {
      permissions: ["billing.manage"],
      persona: qaPersonas.owner,
    });
    await installBillingRoutes(page);
    await page.goto("/billing");
    await page.getByRole("tab", { name: "Cobrança" }).click();
    await expect(
      page.getByRole("heading", { name: "Como seu investimento se divide" }),
    ).toBeVisible();
    const automaticPanel = page.locator(".billing-auto-panel");
    await expect(page.getByText("Agencia", { exact: true })).toBeVisible();
    await expect(page.getByText("Valor direto por loja")).toBeVisible();
    await expect(
      automaticPanel.locator(".billing-auto-summary").getByText(/R\$\s*777,99/),
    ).toBeVisible();
    await expect(
      automaticPanel.getByRole("cell", { name: "Loja Centro" }),
    ).toHaveCount(2);
    await expect(
      automaticPanel.getByRole("cell", { name: "CRM WhatsApp" }),
    ).toBeVisible();
    await expect(
      automaticPanel.getByText(/R\$\s*249,99/).first(),
    ).toBeVisible();
    await expect(
      automaticPanel.getByRole("cell", { name: "Loja Norte" }),
    ).toBeVisible();
    await expect(
      automaticPanel.getByRole("cell", { name: "29.43%" }),
    ).toBeVisible();
    await saveQaScreenshot(page, testInfo, "billing-automatic-desktop");
    await setQaViewport(page, "mobile");
    await page.reload();
    await page.getByRole("tab", { name: "Cobrança" }).click();
    await expect(
      page.getByRole("heading", { name: "Como seu investimento se divide" }),
    ).toBeVisible();
    await expect(
      page
        .locator(".billing-auto-panel")
        .locator(".billing-auto-summary")
        .getByText(/R\$\s*777,99/),
    ).toBeVisible();
    await saveQaScreenshot(page, testInfo, "billing-automatic-mobile");
  });
});

async function installBillingRoutes(page: Page) {
  await page.route("**/api/v1/billing/provider/status", async (route) => {
    await route.fulfill({
      body: JSON.stringify({
        configured: true,
        missingConfiguration: [],
        provider: "asaas",
        webhookConfigured: true,
      }),
      headers: { "content-type": "application/json" },
      status: 200,
    });
  });

  await page.route("**/api/v1/billing/overview", async (route) => {
    await route.fulfill({
      body: JSON.stringify(billingOverview),
      headers: { "content-type": "application/json" },
      status: 200,
    });
  });
}
const billingOverview = {
  addons: [
    {
      catalogVersion: "2026-07-v1",
      code: "crm_whatsapp_instance",
      featureKey: "crm",
      id: "addon_crm_whatsapp",
      includedInTrial: true,
      monthlyPriceCents: 24999,
      name: "CRM WhatsApp",
      status: "active",
    },
  ],
  allocations: [
    {
      activeEntitlementCount: 5,
      addonCount: 1,
      monthlyAmountCents: 54899,
      planCode: "growth",
      planName: "Growth",
      storeId: "store_1",
      storeName: "Loja Centro",
      storeSlug: "loja-centro",
      subscriptionStatus: "active",
    },
    {
      activeEntitlementCount: 3,
      addonCount: 0,
      monthlyAmountCents: 22900,
      planCode: "core",
      planName: "Core",
      storeId: "store_2",
      storeName: "Loja Norte",
      storeSlug: "loja-norte",
      subscriptionStatus: "active",
    },
  ],
  authority: {
    currentActorCanManage: true,
    managedBy: "agency",
    managerLabel: "Agencia",
    ownerBillingAccess: "blocked_by_agency",
    summary: "A agencia gerencia a cobranca das lojas vinculadas.",
  },
  chargePreview: {
    cadence: "monthly",
    collectionMethod: "card_on_file",
    collectionTiming: "cycle_end",
    currency: "BRL",
    hasAgencyDiscount: false,
    lineItems: [
      {
        allocationPercent: 38.43,
        amountCents: 29900,
        description: "Plano recorrente",
        endsAt: null,
        fullAmountCents: 29900,
        id: "subscription_item_plan_store_1",
        itemType: "plan",
        kind: "subscription_item",
        label: "Growth",
        periodEnd: "2026-07-31T00:00:00.000Z",
        periodStart: "2026-07-01T00:00:00.000Z",
        prorationApplied: false,
        prorationFactor: 1,
        quantity: 1,
        sourceId: "plan_growth",
        startsAt: "2026-07-01T00:00:00.000Z",
        storeId: "store_1",
        storeName: "Loja Centro",
        unitAmountCents: 29900,
      },
      {
        allocationPercent: 32.13,
        amountCents: 24999,
        description: "Add-on recorrente x 1",
        endsAt: null,
        fullAmountCents: 24999,
        id: "subscription_item_addon_store_1",
        itemType: "addon",
        kind: "subscription_item",
        label: "CRM WhatsApp",
        periodEnd: "2026-07-31T00:00:00.000Z",
        periodStart: "2026-07-01T00:00:00.000Z",
        prorationApplied: false,
        prorationFactor: 1,
        quantity: 1,
        sourceId: "addon_crm_whatsapp",
        startsAt: "2026-07-01T00:00:00.000Z",
        storeId: "store_1",
        storeName: "Loja Centro",
        unitAmountCents: 24999,
      },
      {
        allocationPercent: 29.43,
        amountCents: 22900,
        description: "Plano recorrente",
        endsAt: null,
        fullAmountCents: 22900,
        id: "subscription_item_plan_store_2",
        itemType: "plan",
        kind: "subscription_item",
        label: "Core",
        periodEnd: "2026-07-31T00:00:00.000Z",
        periodStart: "2026-07-01T00:00:00.000Z",
        prorationApplied: false,
        prorationFactor: 1,
        quantity: 1,
        sourceId: "plan_core",
        startsAt: "2026-07-01T00:00:00.000Z",
        storeId: "store_2",
        storeName: "Loja Norte",
        unitAmountCents: 22900,
      },
    ],
    prorationPolicy: "store_days_active",
    subtotalCents: 77799,
    totalCents: 77799,
  },
  entitlementEvents: [],
  entitlementMatrix: [
    {
      endsAt: null,
      featureKey: "subdomain",
      includedInPlan: true,
      limitValue: null,
      source: "billing_console",
      startsAt: null,
      status: "active",
    },
    {
      endsAt: null,
      featureKey: "crm",
      includedInPlan: false,
      limitValue: null,
      source: "billing_console",
      startsAt: null,
      status: "active",
    },
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
    monthlyRecurringCents: 77799,
    nextDueAt: null,
    openInvoiceCount: 0,
    overdueInvoiceCount: 0,
    paidThisPeriodCents: 0,
  },
  plans: [],
  storeId: "store_1",
  subscription: {
    currentPeriodEnd: null,
    currentPeriodStart: null,
    id: "subscription_1",
    plan: null,
    status: "active",
  },
  tenantId: "tenant_1",
} as const;
