import { expect, test, type Page } from "@playwright/test";
import {
  agencyBillingOverview,
  ownerBillingOverview,
} from "./fixtures/billingUx";
import { installLocalSession } from "./support/auth";
import { qaPersonas } from "./support/personas";
import { expectAccessible, expectViewportSafe } from "./support/uiQuality";
import { setQaViewport } from "./support/viewports";

test.describe("billing plan and packages UX", () => {
  test("individual owner understands the active plan composition", async ({
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
    await setQaViewport(page, "desktop");
    await page.goto("/billing");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    if (!isBaselineCapture()) {
      await expectCommercialPlan(page);
      await page.getByRole("tab", { name: "Cobrança" }).click();
      await expect(
        page.getByRole("button", { name: "Ativar meu plano" }),
      ).not.toBeVisible();
      await page.getByRole("tab", { name: "Plano e pacotes" }).click();
    }
    await expectViewportSafe(page);
    await expectAccessible(page);
    await page.screenshot({
      fullPage: true,
      path: screenshotPath("owner", "desktop"),
    });
    await setQaViewport(page, "mobile");
    await page.reload();
    await waitForBillingContent(page);
    await expectViewportSafe(page);
    await expectAccessible(page);
    await page.screenshot({
      fullPage: true,
      path: screenshotPath("owner", "mobile"),
    });
  });

  test("agency configures packages inside a selected store context", async ({
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
      await expect(page.getByText("Configuração por loja")).toBeVisible();
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
      name: "Uma base completa, com espaço para sua loja crescer",
    }),
  ).toBeVisible();
  await expect(
    page.getByText("Plano base", { exact: true }).first(),
  ).toBeVisible();
  await expect(page.getByRole("heading", { name: "Growth" })).toBeVisible();
}

async function waitForBillingContent(page: Page) {
  if (isBaselineCapture()) {
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    return;
  }
  await expectCommercialPlan(page);
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
