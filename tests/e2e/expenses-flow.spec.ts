import { writeFile } from "node:fs/promises";
import { expect, test, type Page } from "@playwright/test";
import { saveQaScreenshot } from "./support/artifacts";
import { installLocalSession, loginAs } from "./support/auth";
import {
  collectPageDiagnostics,
  expectNoPageCrashes,
} from "./support/diagnostics";
import { qaPersonas } from "./support/personas";
import { setQaViewport } from "./support/viewports";

test.use({ baseURL: process.env.QA_BASE_URL ?? "http://127.0.0.1:5173" });

test.describe("expenses flow", () => {
  test("owner can filter, create, edit, pay, cancel and review expenses", async ({
    page,
  }, testInfo) => {
    const diagnostics = collectPageDiagnostics(page);
    const uniqueName = `Gasto QA ${Date.now()}`;
    const editedName = `${uniqueName} editado`;
    const receiptTitle = `Recibo ${uniqueName}`;

    await setQaViewport(page, "desktop");
    await loginAs(page, qaPersonas.owner, testInfo);
    await mockSignedStorageUploads(page);
    await page.goto("/expenses");

    await expect(
      page.getByRole("heading", { name: "Fluxo de caixa", level: 1 }),
    ).toBeVisible();
    await expect(
      page.getByText(/Carregando lançamentos|Carregando lancamentos/),
    ).toHaveCount(0);
    await saveQaScreenshot(page, testInfo, "expenses-desktop-default");

    await selectFilter(page, "Período", "Todos");
    const audiRow = page.getByRole("row", { name: /Revis[aã]o Audi A4/ });
    await expect(audiRow).toBeVisible();
    await expect(audiRow).toContainText("Preparação");

    await page.getByPlaceholder(/Descri[cç][aã]o ou categoria/i).fill("Audi");
    await expect(audiRow).toBeVisible();
    await saveQaScreenshot(page, testInfo, "expenses-filtered-audi");

    await page.getByPlaceholder(/Descri[cç][aã]o ou categoria/i).fill("");
    await page
      .getByRole("button", { name: /Novo lan[cç]amento/i })
      .first()
      .click();
    await expect(
      page.getByRole("heading", { name: /Novo lan[cç]amento/i }),
    ).toBeVisible();
    await page.getByRole("button", { name: /Pr[oó]ximo/i }).click();
    await page.getByRole("button", { name: /Pr[oó]ximo/i }).click();
    await page.getByLabel(/Identifica[cç][aã]o/i).fill(uniqueName);
    await page.getByLabel("Valor").fill("321.45");
    await page.getByLabel(/Observa[cç][aã]o/i).fill("Criado pelo fluxo QA");
    await saveQaScreenshot(page, testInfo, "expenses-create-modal");
    await page.getByRole("button", { name: /Salvar lan[cç]amento/i }).click();

    await expect(page.getByText(/Lan[cç]amento criado/i)).toBeVisible();
    const createdRow = page.getByRole("row").filter({ hasText: uniqueName });
    await expect(createdRow).toBeVisible();
    await saveQaScreenshot(page, testInfo, "expenses-created");

    const receiptPath = testInfo.outputPath("expenses-receipt.pdf");
    await writeFile(
      receiptPath,
      Buffer.from("%PDF-1.4\n1 0 obj\n<<>>\nendobj\ntrailer\n<<>>\n%%EOF\n"),
    );
    await createdRow.getByRole("button", { name: /Anexar recibo/i }).click();
    await expect(page.getByText(/Comprovante opcional/i)).toBeVisible();
    const receiptDialog = page.getByRole("dialog", {
      name: /Editar lan[cç]amento/i,
    });
    await receiptDialog
      .locator('input[type="file"]')
      .setInputFiles(receiptPath);
    await receiptDialog.getByLabel("Título").fill(receiptTitle);
    await saveQaScreenshot(page, testInfo, "expenses-receipt-modal");
    const uploadResponse = page.waitForResponse(
      (response) =>
        response.url().includes("/api/v1/finance/entries/") &&
        response.url().includes("/documents/uploads") &&
        response.request().method() === "POST",
    );
    const attachResponse = page.waitForResponse(
      (response) =>
        response.url().includes("/api/v1/finance/entries/") &&
        response.url().includes("/documents") &&
        !response.url().includes("/uploads") &&
        response.request().method() === "POST",
    );
    await receiptDialog
      .getByRole("button", { name: /Salvar lan[cç]amento/i })
      .click();
    await expect((await uploadResponse).status()).toBe(201);
    await expect((await attachResponse).status()).toBe(201);
    await expect(
      createdRow.getByText(`Comprovante: ${receiptTitle}`),
    ).toBeVisible();
    await saveQaScreenshot(page, testInfo, "expenses-receipt-attached");

    await createdRow.getByRole("button", { name: /Editar/i }).click();
    await page.getByLabel(/Identifica[cç][aã]o/i).fill(editedName);
    await page.getByRole("button", { name: /Salvar lan[cç]amento/i }).click();
    await expect(page.getByText(/Lan[cç]amento salvo/i)).toBeVisible();

    const editedRow = page.getByRole("row").filter({ hasText: editedName });
    await expect(editedRow).toBeVisible();
    await editedRow.getByRole("button", { name: /Marcar como pago/i }).click();
    await expect(editedRow.getByText("Pago", { exact: true })).toBeVisible();

    await editedRow.getByRole("button", { name: /Cancelar/i }).click();
    const cancelDialog = page.getByRole("dialog", {
      name: /Cancelar lan[cç]amento/i,
    });
    await expect(cancelDialog).toBeVisible();
    await cancelDialog
      .getByRole("button", { name: /Cancelar lan[cç]amento/i })
      .click();
    await expect(page.getByText(/Lan[cç]amento cancelado/i)).toBeVisible();
    await expect(
      editedRow.getByText("Cancelado", { exact: true }),
    ).toBeVisible();
    await saveQaScreenshot(page, testInfo, "expenses-cancelled");

    await setQaViewport(page, "mobile");
    await page.goto("/expenses");
    await expect(
      page.getByRole("heading", { name: "Fluxo de caixa", level: 1 }),
    ).toBeVisible();
    await expect(
      page
        .getByLabel("Lançamentos móveis")
        .getByLabel(/Lançamento/)
        .first(),
    ).toBeVisible();
    await saveQaScreenshot(page, testInfo, "expenses-mobile");

    expectNoPageCrashes(diagnostics);
    expect(diagnostics.consoleErrors).toEqual([]);
  });

  test("restricted users see an intentional unavailable state", async ({
    page,
  }, testInfo) => {
    await installLocalSession(page, {
      permissions: ["inventory.read"],
      persona: qaPersonas.owner,
    });

    await page.goto("/expenses");
    await expect(page.getByText("Acesso restrito")).toBeVisible();
    await expect(page.getByText(/não tem acesso a gastos/i)).toBeVisible();
    await saveQaScreenshot(page, testInfo, "expenses-restricted");
  });

  test("finance readers see data without misleading mutation controls", async ({
    page,
  }, testInfo) => {
    await installLocalSession(page, {
      permissions: ["finance.read"],
      persona: qaPersonas.owner,
    });

    await page.goto("/expenses");
    await expect(
      page.getByRole("heading", { name: "Fluxo de caixa", level: 1 }),
    ).toBeVisible();
    await expect(page.getByText(/modo somente leitura/i)).toBeVisible();
    await expect(
      page.getByRole("button", { name: /Novo lan[cç]amento/i }),
    ).toHaveCount(0);
    await selectFilter(page, "Período", "Todos");
    const audiRow = page.getByRole("row", { name: /Revis[aã]o Audi A4/ });
    await expect(audiRow).toBeVisible();
    await expect(
      audiRow.getByRole("button", { name: /Editar|Pagar|Cancelar|recibo/i }),
    ).toHaveCount(0);
    await saveQaScreenshot(page, testInfo, "expenses-read-only");
  });
});

async function selectFilter(page: Page, label: string, nextValue: string) {
  const field = page.locator("label").filter({ hasText: label }).first();
  await field.getByRole("button", { name: label }).click();
  await page.getByRole("option", { name: nextValue }).click();
}

async function mockSignedStorageUploads(page: Page) {
  await page.route(
    /https:\/\/[^/]+\.r2\.cloudflarestorage\.com\/.*/,
    async (route) => {
      if (route.request().method() !== "PUT") {
        await route.continue();
        return;
      }
      await route.fulfill({
        headers: { etag: '"qa-finance-upload"' },
        status: 200,
      });
    },
  );
}
