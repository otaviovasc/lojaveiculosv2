import { expect, test } from "@playwright/test";
import { saveQaScreenshot } from "./support/artifacts";
import { loginAs } from "./support/auth";
import {
  collectPageDiagnostics,
  expectNoPageCrashes,
} from "./support/diagnostics";
import { qaPersonas } from "./support/personas";
import { setQaViewport } from "./support/viewports";

const availableSaleContext = new URLSearchParams({
  buyerEmail: "qa.sales@example.test",
  buyerName: "Cliente QA Sales",
  buyerPhone: "(11) 97777-0000",
  leadId: "20000000-0000-4000-8000-000000000001",
  listingId: "10000000-0000-4000-8000-000000000001",
  listingTitle: "Audi A4 Prestige Plus 2.0 TFSI 2022",
  priceCents: "18990000",
  unitId: "11000000-0000-4000-8000-000000000001",
  unitLabel: "LV-A4-PRETO",
});

const seedOwnerUserId = "02020202-0202-4202-8202-020202020202";

test.use({ baseURL: process.env.QA_BASE_URL ?? "http://127.0.0.1:5173" });

test.describe("Sales QA flow", () => {
  test("validates list filters and a linked sale lifecycle", async ({
    page,
  }, testInfo) => {
    const diagnostics = collectPageDiagnostics(page);

    await setQaViewport(page, "desktop");
    await loginAs(page, qaPersonas.owner, testInfo);
    await page.getByRole("button", { name: "Vendas" }).click();

    await expect(
      page.getByRole("heading", { name: "Workspace de Vendas" }),
    ).toBeVisible();
    await expect(page.getByText("Faturamento recebido")).toBeVisible();
    await expect(page.getByText("R$ 146.500,00").first()).toBeVisible();
    await expect(
      page.getByRole("button", { name: /Toyota Hilux SRX 2021 Carla/ }),
    ).toBeVisible();
    await page
      .getByRole("button", { name: /Toyota Hilux SRX 2021 Carla/ })
      .click();
    await page
      .locator(".sales-wizard-step")
      .filter({ hasText: "Revisão" })
      .click();
    const closedSaleReview = page
      .locator("div.sales-glass-panel")
      .filter({ hasText: "Composição Financeira" });
    await expect(closedSaleReview).toContainText(
      /Total em Pagamentos\s*R\$\s*146\.500,00/,
    );
    await expect(closedSaleReview).toContainText(/Diferença\s*Quitada/);
    await expect(closedSaleReview).not.toContainText(/restante/i);
    const closedSaleSummary = page.locator(".sales-summary-aside");
    await expect(closedSaleSummary).toContainText(
      /Total Lançado\s*R\$\s*146\.500,00/,
    );
    await expect(closedSaleSummary).not.toContainText("Saldo devedor");
    await saveQaScreenshot(page, testInfo, "05-closed-sale-review");
    await saveQaScreenshot(page, testInfo, "sales-list");

    await page.getByRole("button", { name: "Fechada", exact: true }).click();
    await expect(
      page.getByRole("button", { name: /Toyota Hilux SRX 2021 Carla/ }),
    ).toBeVisible();

    await page
      .getByPlaceholder("Buscar por lead, comprador ou modelo...")
      .fill("sem resultado qa");
    await expect(page.getByText("Nenhuma venda encontrada")).toBeVisible();
    await saveQaScreenshot(page, testInfo, "sales-search-empty");

    await page.goto(
      `/dashboard?qa=${Date.now()}#/sales?${availableSaleContext.toString()}`,
    );
    await expect(page.getByLabel("Nome do Comprador")).toHaveValue(
      "Cliente QA Sales",
    );
    await page.getByLabel("Vendedor Responsável").fill(seedOwnerUserId);

    await page
      .locator(".sales-wizard-step")
      .filter({ hasText: "Pagamentos" })
      .click();
    await page
      .getByRole("button", { name: "Adicionar Linha de Pagamento" })
      .click();
    await expect(page.getByText("Valor Total Coberto")).toBeVisible();

    await page
      .locator(".sales-wizard-step")
      .filter({ hasText: "Revisão" })
      .click();
    await expect(page.getByText("Total em Pagamentos")).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Reservar Veículo" }),
    ).toBeEnabled();
    await saveQaScreenshot(page, testInfo, "sales-ready-review");

    const reserveResponse = page.waitForResponse(
      (response) =>
        response.url().includes("/api/v1/sales/") &&
        response.url().includes("/reserve") &&
        response.request().method() === "POST",
    );
    await page.getByRole("button", { name: "Reservar Veículo" }).click();
    await expect((await reserveResponse).status()).toBe(200);
    await expect(page.getByText("Reserva ativa")).toBeVisible();

    const closeResponse = page.waitForResponse(
      (response) =>
        response.url().includes("/api/v1/sales/") &&
        response.url().includes("/close") &&
        response.request().method() === "POST",
    );
    await page.getByRole("button", { name: "Fechar Venda" }).click();
    await expect((await closeResponse).status()).toBe(200);
    await expect(page.getByText("Venda fechada")).toBeVisible();

    await setQaViewport(page, "mobile");
    await page.goto("/dashboard#/sales");
    await expect(
      page.getByRole("heading", { name: "Workspace de Vendas" }),
    ).toBeVisible();
    await page.getByRole("button", { name: "Abrir Menu" }).click();
    await expect(
      page.getByRole("dialog", { name: "Navegação mobile" }),
    ).toBeVisible();
    await saveQaScreenshot(page, testInfo, "sales-mobile-menu");

    expectNoPageCrashes(diagnostics);
  });
});
