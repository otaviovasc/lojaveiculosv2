import { expect, test, type Locator, type Page } from "@playwright/test";
import { saveQaScreenshot } from "./support/artifacts";
import { installLocalSession, loginAs } from "./support/auth";
import {
  collectPageDiagnostics,
  expectNoPageCrashes,
} from "./support/diagnostics";
import { qaPersonas } from "./support/personas";
import {
  expectAccessible,
  expectViewportSafe,
  waitForSettledWorkspace,
} from "./support/uiQuality";
import { setQaViewport } from "./support/viewports";

test.use({ baseURL: process.env.QA_BASE_URL ?? "http://127.0.0.1:5173" });

test.describe("commissions flow", () => {
  test("owner can exercise filters, bonus, rule, edit, cancel and mobile cards", async ({
    page,
  }, testInfo) => {
    const diagnostics = collectPageDiagnostics(page);
    const uniqueName = `Bônus QA ${Date.now()}`;
    const editedName = `${uniqueName} editado`;

    await setQaViewport(page, "desktop");
    await loginAs(page, qaPersonas.owner, testInfo);
    await page.goto("/commissions");
    await expect(
      page.getByRole("heading", { name: "Comissões", level: 1 }),
    ).toBeVisible();
    await waitForSettledWorkspace(page);
    await expect(page.getByText("Vendedor não identificado")).toHaveCount(0);

    for (const period of [
      "Esta semana",
      "Mes passado",
      "Customizado",
      "Este mes",
    ]) {
      await selectFilter(page, "Periodo", period);
    }
    for (const status of ["Pendente", "Pago", "Cancelado", "Todos"]) {
      await selectFilter(page, "Status", status);
    }

    await page.getByRole("button", { name: "Bônus manual" }).click();
    const bonusDialog = page.getByRole("dialog", { name: "Bônus manual" });
    await chooseFirstSeller(bonusDialog);
    await bonusDialog.getByLabel("Referência").fill(uniqueName);
    await bonusDialog.getByLabel("Valor").fill("123.45");
    await bonusDialog.getByLabel("Observação").fill("Fluxo completo QA");
    await bonusDialog.getByRole("button", { name: "Salvar bônus" }).click();
    await expect(page.getByText("Bônus salvo")).toBeVisible();

    const createdRow = page.getByRole("row").filter({ hasText: uniqueName });
    await expect(createdRow).toBeVisible();
    await createdRow.getByRole("button", { name: "Editar comissão" }).click();
    const editDialog = page.getByRole("dialog", {
      name: "Editar lançamento",
    });
    await editDialog.getByLabel("Identificação").fill(editedName);
    await editDialog.getByRole("button", { name: "Salvar lançamento" }).click();
    await expect(page.getByText("Comissão salva")).toBeVisible();

    const editedRow = page.getByRole("row").filter({ hasText: editedName });
    await editedRow.getByRole("button", { name: "Cancelar comissão" }).click();
    const cancelDialog = page.getByRole("dialog", {
      name: "Cancelar comissão?",
    });
    await cancelDialog
      .getByRole("button", { name: "Cancelar comissão" })
      .click();
    await expect(
      editedRow.getByText("Cancelado", { exact: true }),
    ).toBeVisible();

    const rulesPanel = page.locator("section").filter({
      has: page.getByRole("heading", { name: "Regras de comissão" }),
    });
    const countBefore = await rulesPanel
      .getByText(/regras ativas/i)
      .textContent();
    await rulesPanel.getByLabel("Nome").fill(`Regra QA ${Date.now()}`);
    await rulesPanel.getByLabel("Categoria").fill("Venda QA");
    await rulesPanel.getByLabel("%").fill("1.25");
    await rulesPanel.getByRole("button", { name: "Criar regra" }).click();
    await expect(rulesPanel.getByText(/regras ativas/i)).not.toHaveText(
      countBefore ?? "",
    );

    await saveQaScreenshot(page, testInfo, "commissions-desktop-complete");
    await expectAccessible(page);
    await expectViewportSafe(page);

    await setQaViewport(page, "mobile");
    await page.goto("/commissions");
    await waitForSettledWorkspace(page);
    await expect(
      page.getByRole("article", { name: /Comissão/ }).first(),
    ).toBeVisible();
    await expectViewportSafe(page);
    await expectAccessible(page);
    await saveQaScreenshot(page, testInfo, "commissions-mobile-cards");

    expectNoPageCrashes(diagnostics);
    expect(diagnostics.consoleErrors).toEqual([]);
  });

  test("finance readers get a complete read-only commission workspace", async ({
    page,
  }, testInfo) => {
    await installLocalSession(page, {
      permissions: ["finance.read"],
      persona: qaPersonas.owner,
    });
    await page.goto("/commissions");
    await expect(
      page.getByRole("heading", { name: "Comissões", level: 1 }),
    ).toBeVisible();
    await expect(page.getByText(/modo somente leitura/i)).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Bônus manual" }),
    ).toHaveCount(0);
    await expect(
      page.getByRole("button", { name: "Pagar vendedor" }),
    ).toHaveCount(0);
    await expect(
      page.getByRole("button", { name: "Editar comissão" }),
    ).toHaveCount(0);
    await expect(
      page.getByRole("button", { name: "Cancelar comissão" }),
    ).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Criar regra" })).toHaveCount(
      0,
    );
    await saveQaScreenshot(page, testInfo, "commissions-read-only");
  });
});

async function selectFilter(page: Page, label: string, value: string) {
  const field = page.locator("label").filter({ hasText: label }).first();
  await field.getByRole("button", { name: label }).click();
  await page.getByRole("option", { name: value, exact: true }).click();
}

async function chooseFirstSeller(dialog: Locator) {
  await dialog.getByRole("button", { name: "Vendedor" }).click();
  const options = dialog.page().getByRole("option");
  const count = await options.count();
  for (let index = 0; index < count; index += 1) {
    const option = options.nth(index);
    if ((await option.textContent())?.includes("Sem vendedor")) continue;
    await option.click();
    return;
  }
  throw new Error("No commission seller option is available for QA.");
}
