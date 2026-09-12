import { expect, test, type Page } from "@playwright/test";
import {
  agencyBillingOverview,
  billingPlans,
  ownerBillingOverview,
} from "./fixtures/billingUx";
import { installLocalSession } from "./support/auth";
import { qaPersonas } from "./support/personas";
import { expectAccessible, expectViewportSafe } from "./support/uiQuality";
import { setQaViewport } from "./support/viewports";

test.describe("billing v3 plan hiring UX", () => {
  test("individual owner keeps permanent Free access and starts a durable paid hire", async ({
    page,
  }) => {
    await installLocalSession(page, {
      permissions: ["billing.manage"],
      persona: qaPersonas.owner,
    });
    await installProviderRoute(page);
    await page.route("**/api/v1/billing/overview", (route) =>
      route.fulfill({ json: ownerBillingOverview }),
    );
    await installPlanHireRoutes(page);
    await setQaViewport(page, "desktop");
    await page.goto("/billing");
    await expect(
      page.getByRole("heading", {
        name: "Um plano completo para cada fase da loja",
      }),
    ).toBeVisible();
    if (!isBaselineCapture()) {
      await expect(
        page.getByRole("heading", {
          name: "Um plano completo para cada fase da loja",
        }),
      ).toBeVisible();
      await expect(
        page.getByRole("radiogroup", { name: "Planos disponíveis" }),
      ).toBeVisible();
      for (const planName of [
        "Free",
        "Essencial",
        "Operação",
        "Gestão",
        "Escala",
      ]) {
        await expect(
          page.getByRole("radio", { name: new RegExp(`^${planName} `) }),
        ).toBeVisible();
      }
      await expect(
        page.getByText("O Free é permanente e não expira."),
      ).toBeVisible();
      await expect(page.getByRole("radio", { name: /^Escala / })).toContainText(
        /A partir de R\$\s+897,00\/mês/,
      );
      await expect(
        page.getByText(
          /teste gratuito|plano anual|módulos extras|comprar adicional|contratar adicional/i,
        ),
      ).toHaveCount(0);
      await page.getByRole("radio", { name: /^Essencial / }).click();
      const hireRequest = page.waitForRequest(
        "**/api/v1/billing/plan-hires",
        (request) => request.method() === "POST",
      );
      await expect(
        page
          .getByLabel("Resumo da contratação")
          .getByRole("button", { name: "Continuar para pagamento" }),
      ).toBeVisible();
      await page
        .getByRole("button", { name: "Continuar para pagamento" })
        .click();
      expect(
        await hireRequest.then((request) => request.postDataJSON()),
      ).toMatchObject({
        planId: billingPlans[1]!.id,
      });
      await expect(page.getByRole("status")).toContainText(
        "Pagamento pendente de confirmação.",
      );
      await page.screenshot({
        fullPage: true,
        path: "/tmp/billing-owner-checkout-candidate-desktop.png",
      });
    }
    await expectViewportSafe(page);
    await expectAccessible(page);
    await page.screenshot({
      fullPage: true,
      path: screenshotPath("owner", "desktop"),
    });
    await setQaViewport(page, "mobile");
    await page.reload();
    await waitForBillingContent(page, false);
    await expectViewportSafe(page);
    await expectAccessible(page);
    await page.screenshot({
      fullPage: true,
      path: screenshotPath("owner", "mobile"),
    });
  });

  test("agency compares cumulative plans inside a selected store context", async ({
    page,
  }) => {
    await installAgencySession(page);
    await installProviderRoute(page, true);
    await page.route("**/api/v1/agency/tenants/tenant_1/overview", (route) =>
      route.fulfill({ json: agencyBillingOverview }),
    );
    await setQaViewport(page, "desktop");
    await page.goto("/agency/admin/unified-billing");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    if (!isBaselineCapture()) {
      await expect(
        page.getByRole("heading", { name: "Auto Prime Centro" }),
      ).toBeVisible();
      await expectCommercialPlan(page);
    }
    await expectViewportSafe(page);
    await expectAccessible(page);
    await page.screenshot({
      fullPage: true,
      path: screenshotPath("agency", "desktop"),
    });
    await setQaViewport(page, "mobile");
    await page.reload();
    await waitForBillingContent(page);
    await expectViewportSafe(page);
    await expectAccessible(page);
    await page.screenshot({
      fullPage: true,
      path: screenshotPath("agency", "mobile"),
    });
  });
});

async function expectCommercialPlan(page: Page) {
  await expect(
    page.getByRole("heading", {
      name: "Um plano completo para cada fase da loja",
    }),
  ).toBeVisible();
  await expect(page.getByRole("radio", { name: /^Operação / })).toBeVisible();
  await expect(page.getByRole("radio", { name: /^Escala / })).toBeVisible();
}

async function waitForBillingContent(page: Page, expectPlan = true) {
  if (isBaselineCapture()) {
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    return;
  }
  if (!expectPlan) {
    await expect(
      page.getByRole("heading", {
        name: "Um plano completo para cada fase da loja",
      }),
    ).toBeVisible();
    await expect(
      page.getByRole("radiogroup", { name: "Planos disponíveis" }),
    ).toBeVisible();
    return;
  }
  await expectCommercialPlan(page);
}

async function installPlanHireRoutes(page: Page) {
  const hire = {
    activatedAt: null,
    catalogVersion: "2026-08-v3",
    checkoutMode: "checkout",
    checkoutUrl: null,
    completedAt: null,
    createdAt: "2026-08-25T12:00:00.000Z",
    failureCode: null,
    id: "hire_e2e_1",
    idempotencyKey: "hire-e2e-idempotency",
    phase: "payment_pending",
    planId: billingPlans[1]!.id,
    planSnapshot: { code: "essencial", name: "Essencial", selectionRank: 2 },
    providerCheckoutId: "checkout_e2e_1",
    providerPaymentId: null,
    providerSubscriptionId: null,
    quotedCents: 19_700,
    status: "payment_pending",
    storeId: "store_owner",
    tenantId: "tenant_1",
    updatedAt: "2026-08-25T12:00:00.000Z",
  };
  await page.route("**/api/v1/billing/plan-hires", (route) =>
    route.fulfill({ json: hire, status: 201 }),
  );
  await page.route("**/api/v1/billing/plan-hires/hire_e2e_1", (route) =>
    route.fulfill({ json: hire }),
  );
}

function isBaselineCapture() {
  return process.env.BILLING_BASELINE === "true";
}

function screenshotPath(persona: "agency" | "owner", viewport: string) {
  const state = isBaselineCapture() ? "before" : "candidate";
  return `/tmp/billing-${persona}-${state}-${viewport}.png`;
}

async function installProviderRoute(page: Page, agency = false) {
  const path = agency
    ? "**/api/v1/agency/tenants/tenant_1/billing/provider/status"
    : "**/api/v1/billing/provider/status";
  await page.route(path, (route) =>
    route.fulfill({
      json: {
        configured: true,
        missingConfiguration: [],
        provider: "asaas",
        webhookConfigured: true,
      },
    }),
  );
}

async function installAgencySession(page: Page) {
  await page.addInitScript(() =>
    localStorage.setItem(
      "lojaveiculosv2:local-auth-user-id",
      "clerk_seed_agency",
    ),
  );
  await page.route("**/api/v1/session/bootstrap", (route) =>
    route.fulfill({
      json: {
        defaultStore: null,
        needsOnboarding: false,
        platformAdmin: false,
        stores: [],
        tenantMemberships: [
          {
            role: "agency",
            status: "active",
            tenantId: "tenant_1",
            tenantName: "Grupo Auto Prime",
          },
        ],
        user: {
          clerkUserId: "clerk_seed_agency",
          email: "agency@example.com",
          id: "user_agency",
          name: "Agência Auto Prime",
        },
      },
    }),
  );
}
