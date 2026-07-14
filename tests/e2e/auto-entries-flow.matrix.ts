import {
  expect,
  type APIRequestContext,
  type Locator,
  type Page,
} from "@playwright/test";
import {
  cleanupRules,
  ruleCard,
  selectOption,
} from "./auto-entries-flow.support";

export async function runAutoEntryOptionMatrix(
  page: Page,
  request: APIRequestContext,
) {
  const name = `Matriz automática QA ${Date.now()}`;
  try {
    await page
      .getByRole("tab", { exact: true, name: "Personalizadas" })
      .click();
    await page.getByRole("button", { name: "Nova regra" }).click();
    const dialog = page.getByRole("dialog", { name: "Nova regra automática" });
    await dialog.getByLabel("Nome da regra").fill(name);
    await dialog.getByLabel("Categoria").fill("Matriz de validação");

    await dialog.getByLabel("Valor fixo (R$)").fill("0");
    await submitInvalid(dialog);
    await expectExactError(dialog, "Informe um valor maior que zero.");

    await dialog.getByLabel("Prioridade").fill("101");
    await expectRangeOverflow(dialog.getByLabel("Prioridade"));
    await selectOption(page, dialog, "Momento do lançamento", "Dias depois");
    await dialog.getByLabel("Quantidade").fill("366");
    await expectRangeOverflow(dialog.getByLabel("Quantidade"));

    await selectOption(page, dialog, "Momento do lançamento", "Dia do mês");
    await dialog.getByLabel("Dia").fill("32");
    await expectRangeOverflow(dialog.getByLabel("Dia"));

    await dialog.getByLabel("Prioridade").fill("45");
    await selectOption(page, dialog, "Momento do lançamento", "No mesmo dia");
    await selectOption(page, dialog, "Modelo de cálculo", "Percentual");
    await dialog.getByLabel("Percentual (%)").fill("100,01");
    await submitInvalid(dialog);
    await expectExactError(dialog, "Use um percentual entre 0,01% e 100%.");

    await selectOption(page, dialog, "Modelo de cálculo", "Valor fixo");
    await dialog.getByLabel("Valor fixo (R$)").fill("250,00");
    await selectOption(page, dialog, "Tipo de lançamento", "Comissão");
    const sellerName = await chooseFirstSourceSeller(page, dialog);

    const createResponse = page.waitForResponse(
      (response) =>
        response.url().endsWith("/api/v1/finance/auto-entry-rules") &&
        response.request().method() === "POST",
    );
    await dialog.getByRole("button", { name: "Criar regra" }).click();
    expect((await createResponse).status()).toBeLessThan(300);
    let card = ruleCard(page, name);
    await expect(card).toContainText("Comissão");
    await expect(card).toContainText(sellerName);

    await card.getByRole("button", { name: `Editar regra ${name}` }).click();
    const editDialog = page.getByRole("dialog", {
      name: "Editar regra automática",
    });
    await selectOption(page, editDialog, "Evento de origem", "Seguro emitido");
    await selectOption(page, editDialog, "Modelo de cálculo", "Percentual");
    await editDialog.getByLabel("Percentual (%)").fill("2,5");
    await selectOption(page, editDialog, "Tipo de lançamento", "Despesa");
    await editDialog.getByLabel("Categoria").fill("Despesa de seguro");

    const updateResponse = page.waitForResponse(
      (response) =>
        response.url().includes("/api/v1/finance/auto-entry-rules/") &&
        response.request().method() === "PATCH",
    );
    await editDialog.getByRole("button", { name: "Salvar alterações" }).click();
    expect((await updateResponse).status()).toBeLessThan(300);
    card = ruleCard(page, name);
    await expect(card).toContainText("Despesa");
    await expect(card).toContainText("2,5% sobre o prêmio do seguro");
    await expect(card).toContainText(sellerName);
  } finally {
    await cleanupRules(request, [name]);
  }
}

async function submitInvalid(dialog: Locator) {
  await dialog.getByRole("button", { name: "Criar regra" }).click();
  await expect(dialog).toBeVisible();
}

async function expectExactError(dialog: Locator, message: string) {
  await expect(dialog.getByText(message, { exact: true })).toBeVisible();
}

async function expectRangeOverflow(input: Locator) {
  expect(
    await input.evaluate(
      (element) => (element as HTMLInputElement).validity.rangeOverflow,
    ),
  ).toBe(true);
}

async function chooseFirstSourceSeller(page: Page, dialog: Locator) {
  await dialog.getByRole("button", { name: "Vendedor da origem" }).click();
  const option = page
    .getByRole("option")
    .filter({ hasNotText: "Qualquer vendedor da origem" })
    .first();
  await expect(option).toBeVisible();
  const label = (await option.textContent())?.trim() ?? "";
  if (!label) throw new Error("No source seller option is available for QA.");
  await option.click();
  return label.split(" · ")[0] ?? label;
}
