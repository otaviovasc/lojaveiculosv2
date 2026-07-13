import { expect, test, type Locator, type Page } from "@playwright/test";
import { saveQaScreenshot } from "./support/artifacts";
import { loginAs } from "./support/auth";
import {
  collectPageDiagnostics,
  expectNoPageCrashes,
} from "./support/diagnostics";
import { qaPersonas } from "./support/personas";
import { selectFirstComboboxOption } from "./support/sales";
import {
  cleanupDisposableListing,
  createDisposableSaleContext,
  expectCancelledReservationPersistence,
  expectSaleOptionsPersisted,
} from "./support/salesOptions";
import {
  expectAccessible,
  expectViewportSafe,
  waitForSettledWorkspace,
} from "./support/uiQuality";
import { setQaViewport } from "./support/viewports";

test.use({ baseURL: process.env.QA_BASE_URL ?? "http://127.0.0.1:5173" });

const paymentOptions = [
  "PIX",
  "Transferência (TED/DOC)",
  "Dinheiro em Espécie",
  "Financiamento Bancário",
  "Cartão de Crédito",
  "Boleto Bancário",
  "Carta de Crédito (Consórcio)",
  "Veículo na Troca (Trade-in)",
] as const;

const documentKinds = [
  "Contrato de Compra e Venda",
  "Recibo de Venda",
  "Termo de Entrega",
  "Procuração",
] as const;

test("persists sale options and compensates a cancelled reservation", async ({
  page,
}, testInfo) => {
  test.setTimeout(120000);
  const diagnostics = collectPageDiagnostics(page);
  await setQaViewport(page, "desktop");
  await loginAs(page, qaPersonas.owner, testInfo);
  const context = await createDisposableSaleContext(page);

  try {
    await page.goto(`/dashboard?qa=${Date.now()}#/sales?${context.query}`);
    await expect(page.getByLabel("Nome Completo")).toHaveValue(
      "Cliente QA Opções",
    );
    await selectFirstComboboxOption(page, "Vendedor Responsável");

    await page
      .getByRole("button", { name: /Valores, Pagos & Serviços/ })
      .click();
    await exercisePaymentOptions(page);
    await fillServices(page);

    await page.getByRole("button", { name: /Documentos & Validação/ }).click();
    await exerciseDocuments(page);
    await expectSaleOptionsPersisted(page, context);
    await waitForSettledWorkspace(page);
    await expectViewportSafe(page);
    await expectAccessible(page);
    await saveQaScreenshot(page, testInfo, "sales-options-desktop");

    const reserveResponse = page.waitForResponse(
      (response) =>
        response.url().includes("/reserve") &&
        response.request().method() === "POST",
    );
    await page.getByRole("button", { name: "Reservar Veículo" }).click();
    await expect((await reserveResponse).status()).toBe(200);
    await expect(page.getByText("Reserva ativa")).toBeVisible();

    await page.getByRole("button", { name: "Cancelar reserva" }).click();
    const dialog = page.getByRole("dialog", { name: "Cancelar reserva" });
    await expect(dialog).toBeVisible();
    const confirm = dialog.getByRole("button", { name: "Cancelar reserva" });
    await expect(confirm).toBeDisabled();
    const reason = "Cliente desistiu após revisão das condições";
    await dialog.getByLabel("Motivo do cancelamento").fill(reason);

    const cancelRequest = page.waitForRequest(
      (request) =>
        request.url().includes("/cancel") && request.method() === "POST",
    );
    const cancelResponse = page.waitForResponse(
      (response) =>
        response.url().includes("/cancel") &&
        response.request().method() === "POST",
    );
    await confirm.click();
    expect((await cancelRequest).postDataJSON()).toMatchObject({
      overrideReason: reason,
    });
    await expect((await cancelResponse).status()).toBe(200);
    await expect(page.getByText("Venda cancelada")).toBeVisible();
    await expectCancelledReservationPersistence(page, context, reason);

    await setQaViewport(page, "mobile");
    await waitForSettledWorkspace(page);
    await expectViewportSafe(page);
    await expectAccessible(page);
    await saveQaScreenshot(page, testInfo, "cancelled-reservation-mobile");
    expectNoPageCrashes(diagnostics);
  } finally {
    await cleanupDisposableListing(page, context.listingId);
  }
});

async function exercisePaymentOptions(page: Page) {
  await page
    .getByRole("button", { name: "Adicionar Linha de Pagamento" })
    .click();
  const firstRow = page.locator(".sales-payment-row").first();
  for (const label of paymentOptions) {
    await firstRow.getByRole("button", { name: "Método de pagamento" }).click();
    await expect(page.getByRole("option")).toHaveCount(paymentOptions.length);
    await page.getByRole("option", { name: label }).click();
    await expect(
      firstRow.getByRole("button", { name: "Método de pagamento" }),
    ).toContainText(label);
  }
  await selectPaymentMethod(page, firstRow, "PIX");
  await page
    .getByRole("button", { name: "Adicionar Linha de Pagamento" })
    .click();
  const rows = page.locator(".sales-payment-row");
  await expect(rows).toHaveCount(2);
  await fillCurrency(rows.nth(0), "Valor Principal", "2000000");
  await selectPaymentMethod(page, rows.nth(1), "Financiamento Bancário");
  await fillCurrency(rows.nth(1), "Valor Principal", "16990000");
  await expect(page.getByText("Valor Total Coberto")).toBeVisible();
}

async function fillServices(page: Page) {
  await page.getByPlaceholder("Ex: Santander, BV, Itaú...").fill("Banco QA");
  await fillLabel(page, "Valor Financiado", "10000000");
  await fillLabel(page, "Número de Parcelas", "48");
  await selectWithinLabel(
    page,
    "Status do Financiamento",
    "Aprovado / Faturado",
  );

  await page.getByRole("button", { name: "Seguro" }).click();
  await page
    .getByPlaceholder("Ex: Porto Seguro, Allianz, Azul...")
    .fill("Seguradora QA");
  await page.getByPlaceholder("Ex: Alfa Seguros").fill("Corretora QA");
  await fillLabel(page, "Valor do Prêmio / Apólice", "250000");
  await selectWithinLabel(page, "Status do Seguro", "Apólice Emitida");

  await page.getByRole("button", { name: "Comissão" }).click();
  await selectWithinLabel(page, "Regra / Tipo de Comissão", "Valor Fixo (R$)");
  await fillLabel(page, "Valor da Comissão (R$ / %)", "150000");
  await page
    .getByPlaceholder(/Instruções para liberação/)
    .fill("Liberar após entrega");
}

async function exerciseDocuments(page: Page) {
  for (const label of documentKinds) await page.getByLabel(label).uncheck();
  await expect(
    page.getByText("Documentação Validada com Sucesso"),
  ).toBeVisible();
  for (const label of documentKinds) await page.getByLabel(label).check();
  await expect(page.getByText("Documentação com Pendências")).toBeVisible();
  const fields: [RegExp, string][] = [
    [/CPF \/ CNPJ/, "52998224725"],
    [/Endereço Completo/, "Rua QA, 100, Centro"],
    [/Cidade/, "São Paulo"],
    [/Estado \*/, "SP"],
    [/Nacionalidade/, "Brasileiro"],
    [/Estado Civil/, "Solteiro"],
    [/Profissão/, "Analista"],
    [/Renavam/, "12345678901"],
    [/Chassi/, "9BWZZZ377VT004251"],
  ];
  for (const [label, value] of fields) await page.getByLabel(label).fill(value);
  await expect(
    page.getByText("Documentação Validada com Sucesso"),
  ).toBeVisible();
}

async function selectPaymentMethod(page: Page, row: Locator, label: string) {
  await row.getByRole("button", { name: "Método de pagamento" }).click();
  await page.getByRole("option", { name: label }).click();
}

async function fillCurrency(row: Locator, label: string, value: string) {
  await row.getByLabel(label).fill(value);
}

async function fillLabel(page: Page, label: string, value: string) {
  await page
    .locator("label")
    .filter({ hasText: label })
    .locator("input")
    .fill(value);
}

async function selectWithinLabel(page: Page, label: string, option: string) {
  await page
    .locator("label")
    .filter({ hasText: label })
    .getByRole("button")
    .click();
  await page.getByRole("option", { name: option }).click();
}
