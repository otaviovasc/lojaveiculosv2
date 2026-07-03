import { expect, test, type Page } from "@playwright/test";
import { saveQaScreenshot } from "./support/artifacts";
import { installLocalSession } from "./support/auth";
import { qaPersonas } from "./support/personas";
import { setQaViewport } from "./support/viewports";

const ownerLinkedRecordPermissions = [
  "documents.read",
  "inventory.read",
  "lead.read",
  "lead.update",
  "sale.read",
];

test.use({ baseURL: process.env.QA_BASE_URL ?? "http://127.0.0.1:5173" });

test.describe("clients linked sales and documents", () => {
  test.beforeEach(async ({ page }) => {
    await blockSeedAssetRequests(page);
  });

  test("shows linked sales and documents on client detail", async ({
    page,
  }, testInfo) => {
    await setQaViewport(page, "desktop");
    await installLocalSession(page, {
      permissions: ownerLinkedRecordPermissions,
      persona: qaPersonas.owner,
    });

    await page.goto("/dashboard#/crm?surface=leads");
    await expect(page.getByRole("heading", { name: "Clientes" })).toBeVisible();
    await page.getByPlaceholder("Buscar negócios...").fill("Carla");
    await page
      .getByRole("button", { name: "Abrir detalhes de Carla Rocha" })
      .click();

    await expect(
      page.getByRole("heading", { name: "Carla Rocha" }),
    ).toBeVisible();
    await expect(
      page.getByText("Vendas vinculadas", { exact: true }),
    ).toBeVisible();
    await expect(page.getByText("Toyota Hilux SRX 2021").first()).toBeVisible();
    await expect(page.getByText("Fechada")).toBeVisible();
    await saveQaScreenshot(page, testInfo, "clients-linked-sales");

    await selectDetailTab(page, "Arquivos");
    await expect(page.getByText("Arquivos").first()).toBeVisible();
    await expect(page.getByText("Contrato de venda Hilux")).toBeVisible();
    await expect(page.getByText("Recibo de venda Hilux")).toBeVisible();
    await expect(page.getByText("Termo de entrega Hilux")).toBeVisible();
    await saveQaScreenshot(page, testInfo, "clients-linked-documents");
  });
});

async function blockSeedAssetRequests(page: Page) {
  await page.route(
    "https://assets-v2.lojaveiculos.com.br/**",
    async (route) => {
      await route.fulfill({
        body: `<svg xmlns="http://www.w3.org/2000/svg" width="160" height="90" />`,
        contentType: "image/svg+xml",
        status: 200,
      });
    },
  );
}

async function selectDetailTab(page: Page, tabName: string) {
  const tab = page.getByRole("tab", { name: tabName });
  await expect(tab).toBeVisible();
  await tab.click();
  await expect(tab).toHaveAttribute("aria-selected", "true");
}
