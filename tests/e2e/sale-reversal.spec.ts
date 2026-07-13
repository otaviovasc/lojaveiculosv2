import { expect, test, type Page, type TestInfo } from "@playwright/test";
import { saveQaScreenshot } from "./support/artifacts";
import { loginAs } from "./support/auth";
import {
  collectPageDiagnostics,
  expectNoPageCrashes,
} from "./support/diagnostics";
import { qaPersonas } from "./support/personas";
import {
  expectClosedSaleArtifacts,
  expectSaleReversalPersistence,
  type PersistedSaleRevision,
  type SaleGeneratedDocument,
} from "./support/saleReversal";
import { selectFirstComboboxOption } from "./support/sales";
import {
  cleanupDisposableListing,
  createDisposableSaleContext,
  type DisposableSaleContext,
} from "./support/salesOptions";
import {
  expectAccessible,
  expectViewportSafe,
  waitForSettledWorkspace,
} from "./support/uiQuality";
import { setQaViewport } from "./support/viewports";

test.use({ baseURL: process.env.QA_BASE_URL ?? "http://127.0.0.1:5173" });

test("reverts a closed sale into an editable correction revision", async ({
  page,
}, testInfo) => {
  test.setTimeout(120000);
  const diagnostics = collectPageDiagnostics(page);
  await setQaViewport(page, "desktop");
  await loginAs(page, qaPersonas.owner, testInfo);
  const context = await createDisposableSaleContext(page);

  try {
    const original = await createAndCloseSale(page, context);
    const originalArtifacts = await expectClosedSaleArtifacts(
      page,
      context,
      original,
    );
    const openedDocument = originalArtifacts.documents.find(
      (document) => document.kind === "sale_contract",
    );
    expect(openedDocument).toBeTruthy();
    await openGeneratedDocument(
      page,
      context,
      openedDocument!,
      testInfo,
      "sale-reversal-issued-document",
    );

    await openClosedSale(page, context);
    const reason = "Corrigir o nome civil informado pelo comprador";
    await page.getByRole("button", { name: "Reverter venda" }).click();
    const dialog = page.getByRole("dialog", {
      name: "Reverter venda fechada",
    });
    await expect(dialog).toContainText("A venda original será preservada");
    await dialog.getByLabel("Motivo da correção").fill(reason);

    const revertRequest = page.waitForRequest(
      (request) =>
        request.url().endsWith(`/sales/${original.id}/revert`) &&
        request.method() === "POST",
    );
    const revertResponse = page.waitForResponse(
      (response) =>
        response.url().endsWith(`/sales/${original.id}/revert`) &&
        response.request().method() === "POST",
    );
    await dialog.getByRole("button", { name: "Reverter venda" }).click();
    expect((await revertRequest).postDataJSON()).toEqual({ reason });
    const correctionResponse = await revertResponse;
    expect(correctionResponse.status()).toBe(201);
    const correction =
      (await correctionResponse.json()) as PersistedSaleRevision;

    await expect(page.getByRole("status")).toContainText(
      `Correção atual · revisão ${correction.revision}`,
    );
    await expect(page.getByRole("status")).toContainText(reason);
    await expect(
      page.getByRole("button", { name: "Reverter venda" }),
    ).toHaveCount(0);
    await expect(page.getByLabel("Nome Completo")).toBeEnabled();
    await expect(
      page.getByText(`Placa/Estoque: ${context.unitLabel}`),
    ).toBeVisible();

    const editedBuyerName = `Cliente QA Corrigido ${Date.now()}`;
    const updateResponse = page.waitForResponse(
      (response) =>
        response.url().endsWith(`/sales/${correction.id}`) &&
        response.request().method() === "PATCH",
    );
    await page.getByLabel("Nome Completo").fill(editedBuyerName);
    expect((await updateResponse).status()).toBe(200);
    await waitForSettledWorkspace(page);
    await expectViewportSafe(page);
    await expectAccessible(page);
    await saveQaScreenshot(page, testInfo, "sale-reversal-correction-draft");

    await expectSaleReversalPersistence(
      page,
      context,
      original,
      correction.id,
      editedBuyerName,
      reason,
      originalArtifacts.documents,
      originalArtifacts.financeEntries,
    );
    await openVoidedDocument(page, context, openedDocument!, testInfo);
    expectNoPageCrashes(diagnostics);
  } finally {
    await cleanupDisposableListing(page, context.listingId);
  }
});

async function createAndCloseSale(page: Page, context: DisposableSaleContext) {
  await page.goto(`/dashboard?qa=${Date.now()}#/sales?${context.query}`);
  await expect(page.getByLabel("Nome Completo")).toHaveValue(
    "Cliente QA Opções",
  );
  await selectFirstComboboxOption(page, "Vendedor Responsável");
  await page.getByRole("button", { name: /Valores, Pagos & Serviços/ }).click();
  await page
    .getByRole("button", { name: "Adicionar Linha de Pagamento" })
    .click();
  await expect(page.getByText("Valor Total Coberto")).toBeVisible();
  await page.getByRole("button", { name: /Formalização & Download/ }).click();
  await expect(
    page.getByRole("button", { name: "Fechar Venda" }),
  ).toBeEnabled();

  const closeResponse = page.waitForResponse(
    (response) =>
      response.url().includes("/api/v1/sales/") &&
      response.url().endsWith("/close") &&
      response.request().method() === "POST",
  );
  await page.getByRole("button", { name: "Fechar Venda" }).click();
  const response = await closeResponse;
  expect(response.status()).toBe(200);
  await expect(page.getByText("Venda fechada")).toBeVisible();
  return (await response.json()) as PersistedSaleRevision;
}

async function openGeneratedDocument(
  page: Page,
  context: DisposableSaleContext,
  document: SaleGeneratedDocument,
  testInfo: TestInfo,
  screenshotName: string,
) {
  await page.goto(documentDeepLink(context, document));
  const detail = page.getByLabel("Documento aberto");
  await expect(detail).toBeVisible();
  await expect(detail).toContainText(document.title);
  await expect(detail.getByText("Emitido").first()).toBeVisible();

  const downloadResponse = page.waitForResponse(
    (response) =>
      response.url().includes(`/api/v1/documents/${document.id}/download`) &&
      response.status() === 200,
  );
  await detail.getByRole("button", { name: "Baixar" }).click();
  await downloadResponse;
  await saveQaScreenshot(page, testInfo, screenshotName);
}

async function openVoidedDocument(
  page: Page,
  context: DisposableSaleContext,
  document: SaleGeneratedDocument,
  testInfo: TestInfo,
) {
  await page.goto(documentDeepLink(context, document));
  const detail = page.getByLabel("Documento aberto");
  await expect(detail).toBeVisible();
  await expect(detail).toContainText(document.title);
  await expect(detail.getByText("Cancelado").first()).toBeVisible();
  await saveQaScreenshot(page, testInfo, "sale-reversal-voided-document");
}

async function openClosedSale(page: Page, context: DisposableSaleContext) {
  await page.goto(`/dashboard?qa=${Date.now()}#/sales`);
  const card = page
    .locator("div.sales-glass-panel")
    .filter({ hasText: context.plate })
    .first();
  await expect(card).toBeVisible();
  await card.getByRole("button", { name: "Visualizar" }).click();
  await expect(page.getByText("Venda fechada")).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Reverter venda" }),
  ).toBeVisible();
}

function documentDeepLink(
  context: DisposableSaleContext,
  document: SaleGeneratedDocument,
) {
  const query = new URLSearchParams({
    documentId: document.id,
    unitId: context.unitId,
  });
  return `/dashboard?qa=${Date.now()}#/documents?${query}`;
}
