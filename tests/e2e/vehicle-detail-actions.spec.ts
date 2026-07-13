import { expect, test, type Page } from "@playwright/test";
import { saveQaScreenshot } from "./support/artifacts";
import { loginAs } from "./support/auth";
import { qaPersonas } from "./support/personas";
import {
  createEditableVehicleFixture,
  deleteVehicleFixture,
} from "./support/vehicleFixtures";
import { expectAccessible, expectViewportSafe } from "./support/uiQuality";
import { setQaViewport } from "./support/viewports";

test.use({ baseURL: process.env.QA_BASE_URL ?? "http://127.0.0.1:5173" });

test("persists advertisement, cost, checklist, and document actions", async ({
  page,
}, testInfo) => {
  test.setTimeout(120_000);
  await setQaViewport(page, "desktop");
  await loginAs(page, qaPersonas.owner, testInfo);
  const fixture = await createEditableVehicleFixture(page);
  const description = `Descrição comercial persistida QA ${Date.now()}`;

  try {
    await openFixture(page, fixture.title);
    await selectTab(page, "Anúncio");

    await page.getByLabel("Descrição do anúncio").fill(description);
    const descriptionResponse = waitForListingPatch(page, fixture.id);
    await page.getByRole("button", { name: "Salvar descrição" }).click();
    expect((await descriptionResponse).status()).toBe(200);

    await page.getByLabel("Valor do anúncio").fill("17777700");
    const priceResponse = waitForListingPatch(page, fixture.id);
    await page.getByRole("button", { name: "Salvar valor" }).click();
    expect((await priceResponse).status()).toBe(200);
    await expect(page.getByLabel("Valor do anúncio")).toHaveValue("177.777,00");

    await selectTab(page, "Financeiro");
    await page.getByRole("button", { name: "Novo Custo" }).click();
    const costDialog = page.getByRole("dialog");
    await expect(
      costDialog.getByRole("heading", { name: "Adicionar Novo Custo" }),
    ).toBeVisible();
    await costDialog.getByLabel("Conta / Descrição").fill("Higienização QA");
    await costDialog.getByLabel("Valor (R$)").fill("350.00");
    const costResponse = page.waitForResponse(
      (response) =>
        /\/api\/v1\/inventory\/units\/[^/]+\/costs$/.test(
          new URL(response.url()).pathname,
        ) && response.request().method() === "POST",
    );
    await costDialog.getByRole("button", { name: "Confirmar" }).click();
    expect((await costResponse).status()).toBe(201);
    await expect(
      page.getByRole("cell", { exact: true, name: "Higienização QA" }).first(),
    ).toBeVisible();

    await selectTab(page, "Documentos");
    const checklistResponse = page.waitForResponse(
      (response) =>
        /\/api\/v1\/inventory\/units\/[^/]+\/checklists$/.test(
          new URL(response.url()).pathname,
        ) && response.request().method() === "POST",
    );
    await page
      .getByRole("button", { name: "Criar checklist de entrega" })
      .click();
    expect((await checklistResponse).status()).toBe(201);
    const checklistSection = page.locator("section").filter({
      has: page.getByRole("heading", { name: "Checklist de entrega" }),
    });
    const firstChecklistItem = checklistSection.getByRole("checkbox").first();
    const checklistUpdate = waitForChecklistPatch(page);
    await firstChecklistItem.click();
    expect((await checklistUpdate).status()).toBe(200);
    await expect(checklistSection.getByText(/1\/7 concluídos/)).toBeVisible();

    const uploadSection = page.locator("section").filter({
      has: page.getByRole("heading", { name: "Documentos anexados" }),
    });
    let externalR2PutCount = 0;
    await page.route(
      /^https:\/\/[^/]+\.r2\.cloudflarestorage\.com\/.*$/,
      async (route) => {
        if (route.request().method() !== "PUT") {
          await route.continue();
          return;
        }

        externalR2PutCount += 1;
        await route.fulfill({
          body: "",
          headers: { etag: '"qa-r2-provider-boundary"' },
          status: 200,
        });
      },
    );
    const attachResponse = page.waitForResponse(
      (response) =>
        /\/api\/v1\/inventory\/units\/[^/]+\/documents$/.test(
          new URL(response.url()).pathname,
        ) && response.request().method() === "POST",
    );
    await uploadSection.locator('input[type="file"]').setInputFiles({
      buffer: Buffer.from("%PDF-1.4\n% QA document\n"),
      mimeType: "application/pdf",
      name: "qa-vehicle-document.pdf",
    });
    expect((await attachResponse).status()).toBe(201);
    expect(externalR2PutCount).toBe(1);
    await expect(page.getByText("qa-vehicle-document.pdf")).toBeVisible();

    await selectTab(page, "Histórico");
    await expect(page.getByText("Preço do anúncio alterado")).toBeVisible();
    await expect(page.getByText("Custo registrado")).toBeVisible();
    await expect(page.getByText("Documento registrado")).toBeVisible();
    await expect(page.getByText("Checklist atualizado")).toBeVisible();
    await expectViewportSafe(page);
    await expectAccessible(page);
    await saveQaScreenshot(page, testInfo, "admin-detail-real-actions-history");

    await page.reload();
    await openFixture(page, fixture.title);
    await selectTab(page, "Anúncio");
    await expect(page.getByLabel("Descrição do anúncio")).toHaveValue(
      description,
    );
    await expect(page.getByLabel("Valor do anúncio")).toHaveValue("177.777,00");
  } finally {
    await deleteVehicleFixture(page, fixture.id);
  }
});

async function openFixture(page: Page, title: string) {
  await page.goto("/inventory");
  await expect(page.getByText(title).first()).toBeVisible();
  await page.getByText(title).first().click();
  await expect(
    page.getByRole("navigation", { name: "Abas do veículo" }),
  ).toBeVisible();
}

async function selectTab(page: Page, name: string) {
  await page
    .getByRole("navigation", { name: "Abas do veículo" })
    .getByRole("button", { name, exact: true })
    .click();
}

function waitForListingPatch(page: Page, listingId: string) {
  return page.waitForResponse(
    (response) =>
      new URL(response.url()).pathname ===
        `/api/v1/inventory/listings/${listingId}` &&
      response.request().method() === "PATCH",
  );
}

function waitForChecklistPatch(page: Page) {
  return page.waitForResponse(
    (response) =>
      /\/api\/v1\/inventory\/units\/[^/]+\/checklists\/[^/]+$/.test(
        new URL(response.url()).pathname,
      ) && response.request().method() === "PATCH",
  );
}
