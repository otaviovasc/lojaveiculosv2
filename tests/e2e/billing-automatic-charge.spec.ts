import { expect, test, type Page } from "@playwright/test";
import { agencyBillingOverview } from "./fixtures/billingUx";
import { saveQaScreenshot } from "./support/artifacts";
import { installLocalSession } from "./support/auth";
import { qaPersonas } from "./support/personas";
import { setQaViewport } from "./support/viewports";

test.describe("billing automatic monthly charge", () => {
  test("shows agency-managed effective plan contracts without add-on lines", async ({
    page,
  }, testInfo) => {
    await setQaViewport(page, "desktop");
    await installLocalSession(page, {
      permissions: ["billing.manage"],
      persona: qaPersonas.owner,
    });
    await installBillingRoutes(page);
    await page.goto("/billing");
    await page.getByRole("tab", { name: "Detalhes" }).click();
    await expect(
      page.getByRole("heading", { name: "Como seu investimento se divide" }),
    ).toBeVisible();
    const automaticPanel = page.locator(".billing-auto-panel");
    await expect(page.getByText("Agência", { exact: true })).toBeVisible();
    await expect(page.getByText("Valor direto por loja")).toBeVisible();
    await expect(
      automaticPanel.locator(".billing-auto-summary").getByText(/R\$\s*594,00/),
    ).toBeVisible();
    await expect(
      automaticPanel.getByRole("cell", { name: "Auto Prime Centro" }),
    ).toBeVisible();
    await expect(
      automaticPanel.getByRole("cell", { name: "Operação" }),
    ).toBeVisible();
    await expect(
      automaticPanel.getByRole("cell", { name: "Auto Prime Norte" }),
    ).toBeVisible();
    await expect(
      automaticPanel.getByRole("cell", { name: "Essencial" }),
    ).toBeVisible();
    await expect(automaticPanel.getByText(/add-on|CRM WhatsApp/i)).toHaveCount(
      0,
    );
    await saveQaScreenshot(page, testInfo, "billing-automatic-desktop");

    await setQaViewport(page, "mobile");
    await page.reload();
    await page.getByRole("tab", { name: "Detalhes" }).click();
    await expect(
      page
        .locator(".billing-auto-panel")
        .locator(".billing-auto-summary")
        .getByText(/R\$\s*594,00/),
    ).toBeVisible();
    await saveQaScreenshot(page, testInfo, "billing-automatic-mobile");
  });
});

async function installBillingRoutes(page: Page) {
  await page.route("**/api/v1/billing/provider/status", (route) =>
    route.fulfill({
      json: {
        configured: true,
        missingConfiguration: [],
        provider: "asaas",
        webhookConfigured: true,
      },
    }),
  );
  await page.route("**/api/v1/billing/overview", (route) =>
    route.fulfill({ json: agencyBillingOverview }),
  );
}
