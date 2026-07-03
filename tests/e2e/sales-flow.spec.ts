import { expect, test } from "@playwright/test";
import { saveQaScreenshot } from "./support/artifacts";
import { loginAs } from "./support/auth";
import {
  collectPageDiagnostics,
  expectNoPageCrashes,
} from "./support/diagnostics";
import { qaPersonas } from "./support/personas";
import {
  buildAvailableSaleContext,
  createAndDeleteDraft,
  expectAcquiredTradeInUnit,
  fillTradeIn,
  selectFirstComboboxOption,
} from "./support/sales";
import { setQaViewport } from "./support/viewports";

test.use({ baseURL: process.env.QA_BASE_URL ?? "http://127.0.0.1:5173" });

test.describe("Sales QA flow", () => {
  test("validates list filters and a linked sale lifecycle", async ({
    page,
  }, testInfo) => {
    test.setTimeout(120000);
    const diagnostics = collectPageDiagnostics(page);

    await setQaViewport(page, "desktop");
    await loginAs(page, qaPersonas.owner, testInfo);
    await page.getByRole("button", { name: "Vendas" }).click();

    await expect(
      page.getByRole("heading", { name: "Formalização de Vendas" }),
    ).toBeVisible();
    await expect(page.getByText("Faturamento recebido")).toBeVisible();
    await expect(page.getByText("R$ 146.500,00").first()).toBeVisible();
    const closedSaleCard = page
      .locator("div.sales-glass-panel")
      .filter({ hasText: "Toyota Hilux SRX 2021" })
      .first();
    await expect(
      closedSaleCard.getByRole("button", { name: "Deletar" }),
    ).toHaveCount(0);
    await createAndDeleteDraft(page);
    await expect(closedSaleCard).toBeVisible();
    await closedSaleCard.getByRole("button", { name: "Editar" }).click();
    await page.getByRole("button", { name: /Formalização & Download/ }).click();
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
    await page.getByRole("button", { name: "Voltar" }).first().click();
    await saveQaScreenshot(page, testInfo, "sales-list");

    await page.getByRole("button", { name: "Todos os Status" }).click();
    await page.getByRole("option", { name: "Fechada" }).click();
    await expect(
      page.getByRole("heading", { name: "Toyota Hilux SRX 2021" }),
    ).toBeVisible();

    await page
      .getByPlaceholder("Buscar por lead, comprador, veículo ou placa...")
      .fill("sem resultado qa");
    await expect(page.getByText("Nenhuma venda encontrada")).toBeVisible();
    await saveQaScreenshot(page, testInfo, "sales-search-empty");

    const availableSaleContext = await buildAvailableSaleContext(page);
    await page.goto(
      `/dashboard?qa=${Date.now()}#/sales?${availableSaleContext.query}`,
    );
    await expect(page.getByLabel("Nome Completo")).toHaveValue(
      "Cliente QA Sales",
    );
    await expect(
      page.getByText(`Placa/Estoque: ${availableSaleContext.unitLabel}`),
    ).toBeVisible();
    await expect(page.getByText(availableSaleContext.colorName)).toBeVisible();
    await selectFirstComboboxOption(page, "Vendedor Responsável");

    await page
      .getByRole("button", { name: /Valores, Pagos & Serviços/ })
      .click();
    await page
      .getByRole("button", { name: "Adicionar Linha de Pagamento" })
      .click();
    await expect(page.getByText("Valor Total Coberto")).toBeVisible();
    const tradeInPlate = `TRD${Date.now().toString().slice(-4)}`;
    await fillTradeIn(page, tradeInPlate);

    await page.getByRole("button", { name: /Formalização & Download/ }).click();
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
    await expectAcquiredTradeInUnit(page, tradeInPlate);

    await setQaViewport(page, "mobile");
    await page.goto("/dashboard#/sales");
    await expect(
      page.getByRole("heading", { name: "Formalização de Vendas" }),
    ).toBeVisible();
    await page.getByRole("button", { name: "Abrir Menu" }).click();
    await expect(
      page.getByRole("dialog", { name: "Navegação mobile" }),
    ).toBeVisible();
    await saveQaScreenshot(page, testInfo, "sales-mobile-menu");

    expectNoPageCrashes(diagnostics);
  });
});
