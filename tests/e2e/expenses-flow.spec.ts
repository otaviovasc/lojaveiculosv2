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

    await setQaViewport(page, "desktop");
    await loginAs(page, qaPersonas.owner, testInfo);
    await page.goto("/expenses");

    await expect(
      page.getByRole("heading", { name: "Gastos e contas" }),
    ).toBeVisible();
    await expect(
      page.getByText(/Carregando lançamentos|Carregando lancamentos/),
    ).toHaveCount(0);
    await saveQaScreenshot(page, testInfo, "expenses-desktop-default");

    await selectFilter(page, "Janela", "Todos");
    await expect(page.getByText(/Revis[aã]o Audi A4/)).toBeVisible();
    await expect(page.getByText("Preparação")).toBeVisible();

    await page.getByPlaceholder(/Descri[cç][aã]o ou categoria/i).fill("Audi");
    await expect(page.getByText(/Revis[aã]o Audi A4/)).toBeVisible();
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

    await createdRow.getByRole("button", { name: /Anexar recibo/i }).click();
    await expect(page.getByText(/Comprovante opcional/i)).toBeVisible();
    await saveQaScreenshot(page, testInfo, "expenses-receipt-modal");
    await page.getByRole("button", { exact: true, name: "Cancelar" }).click();

    await createdRow.getByRole("button", { name: /Editar/i }).click();
    await page.getByLabel(/Identifica[cç][aã]o/i).fill(editedName);
    await page.getByRole("button", { name: /Salvar lan[cç]amento/i }).click();
    await expect(page.getByText(/Lan[cç]amento salvo/i)).toBeVisible();

    const editedRow = page.getByRole("row").filter({ hasText: editedName });
    await expect(editedRow).toBeVisible();
    await editedRow.getByRole("button", { name: /Marcar como pago/i }).click();
    await expect(editedRow.getByRole("button", { name: "Pago" })).toBeVisible();

    page.once("dialog", (dialog) => dialog.accept());
    await editedRow.getByRole("button", { name: /Cancelar/i }).click();
    await expect(page.getByText(/Lan[cç]amento cancelado/i)).toBeVisible();
    await expect(
      editedRow.getByRole("button", { name: "Cancelado" }),
    ).toBeVisible();
    await saveQaScreenshot(page, testInfo, "expenses-cancelled");

    await setQaViewport(page, "mobile");
    await page.goto("/expenses");
    await expect(
      page.getByRole("heading", { name: "Gastos e contas" }),
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
});

async function selectFilter(page: Page, label: string, nextValue: string) {
  const field = page.locator("label").filter({ hasText: label }).first();
  await field.getByRole("button", { name: label }).click();
  await page.getByRole("option", { name: nextValue }).click();
}
