import { expect, test } from "@playwright/test";
import {
  cleanupRules,
  createRuleThroughDialog,
  createRuleViaApi,
  ruleCard,
  selectOption,
} from "./auto-entries-flow.support";
import { runAutoEntryOptionMatrix } from "./auto-entries-flow.matrix";
import { saveQaScreenshot } from "./support/artifacts";
import { loginAs } from "./support/auth";
import { qaPersonas } from "./support/personas";
import { expectAccessible, expectViewportSafe } from "./support/uiQuality";
import { setQaViewport } from "./support/viewports";

test.use({ baseURL: process.env.QA_BASE_URL ?? "http://127.0.0.1:5173" });

test.describe("automatic finance entries", () => {
  test("manager creates, edits, pauses, reactivates and archives a rule", async ({
    page,
    request,
  }, testInfo) => {
    const name = `Financiamento QA ${Date.now()}`;
    const editedName = `${name} editado`;
    try {
      await setQaViewport(page, "desktop");
      await loginAs(page, qaPersonas.owner, testInfo);
      await page.goto("/auto-entries");
      await expect(
        page.getByRole("heading", {
          level: 1,
          name: "Lançamentos automáticos",
        }),
      ).toBeVisible();

      let card = await createRuleThroughDialog(page, {
        category: "Comissão financiamento",
        event: "financing_approved",
        name,
        outputType: "Receita",
        percentage: "1,5",
        priority: 80,
        timing: { days: 5, kind: "days_after" },
      });
      await expect(card).toContainText("1,5% sobre o valor financiado");
      await expect(card).toContainText("Receita");
      await expect(card).toContainText("5 dias depois");

      await card.getByRole("button", { name: `Editar regra ${name}` }).click();
      const editDialog = page.getByRole("dialog", {
        name: "Editar regra automática",
      });
      await editDialog.getByLabel("Nome da regra").fill(editedName);
      await selectOption(
        page,
        editDialog,
        "Momento do lançamento",
        "Dia do próximo mês",
      );
      await editDialog.getByLabel("Dia").fill("12");
      const updateResponse = page.waitForResponse(
        (response) =>
          response.url().includes("/api/v1/finance/auto-entry-rules/") &&
          response.request().method() === "PATCH",
      );
      await editDialog
        .getByRole("button", { name: "Salvar alterações" })
        .click();
      expect((await updateResponse).status()).toBeLessThan(300);
      card = ruleCard(page, editedName);
      await expect(card).toContainText("Dia 12 do próximo mês");

      await card
        .getByRole("switch", { name: `Ativar regra ${editedName}` })
        .click();
      await expect(card.getByText("Pausada", { exact: true })).toBeVisible();
      await page.getByRole("button", { name: "Atualizar regras" }).click();
      await expect(ruleCard(page, editedName)).toContainText("Pausada");

      await card
        .getByRole("switch", { name: `Ativar regra ${editedName}` })
        .click();
      await expect(card.getByText("Ativa", { exact: true })).toBeVisible();
      await card
        .getByRole("button", { name: `Excluir regra ${editedName}` })
        .click();
      const deleteDialog = page.getByRole("dialog", {
        name: `Excluir ${editedName}?`,
      });
      await expect(
        deleteDialog.getByText(/exclusão é auditada/i),
      ).toBeVisible();
      await deleteDialog.getByRole("button", { name: "Excluir regra" }).click();
      await expect(
        page.getByRole("heading", { level: 3, name: editedName }),
      ).toHaveCount(0);
      await page.getByRole("button", { name: "Atualizar regras" }).click();
      await expect(
        page.getByRole("heading", { level: 3, name: editedName }),
      ).toHaveCount(0);
    } finally {
      await cleanupRules(request, [name, editedName]);
    }
  });

  test("covers fixed timing variants and all configured domains", async ({
    page,
    request,
  }) => {
    const saleName = `Venda fixa QA ${Date.now()}`;
    const insuranceName = `Seguro mensal QA ${Date.now()}`;
    try {
      await loginAs(page, qaPersonas.owner);
      await page.goto("/auto-entries");
      const saleCard = await createRuleThroughDialog(page, {
        amount: "500,00",
        category: "Comissão de venda",
        event: "vehicle_sale_closed",
        name: saleName,
        timing: { kind: "same_day" },
      });
      await expect(saleCard).toContainText("R$ 500,00");
      await expect(saleCard).toContainText("No mesmo dia");

      const insuranceCard = await createRuleThroughDialog(page, {
        amount: "320,00",
        category: "Receita de seguro",
        event: "insurance_issued",
        name: insuranceName,
        outputType: "Receita",
        timing: { day: 20, kind: "day_of_month" },
      });
      await expect(insuranceCard).toContainText("Dia 20 do mês");
      await expect(insuranceCard).toContainText("Receita");

      await page
        .getByRole("tab", { exact: true, name: "Documentação" })
        .click();
      await expect(
        page.getByRole("heading", {
          exact: true,
          name: "Custos e receita da loja",
        }),
      ).toBeVisible();
      await expect(
        page.getByRole("button", { name: "Nova regra" }),
      ).toHaveCount(0);
      await page.getByRole("tab", { exact: true, name: "Consórcio" }).click();
      await expect(
        page.getByRole("heading", {
          exact: true,
          name: "Divisão do consórcio",
        }),
      ).toBeVisible();
      await expect(
        page.getByRole("button", { name: "Nova regra" }),
      ).toHaveCount(0);
    } finally {
      await cleanupRules(request, [saleName, insuranceName]);
    }
  });

  test("protects unsaved dialog changes before closing", async ({ page }) => {
    await loginAs(page, qaPersonas.owner);
    await page.goto("/auto-entries");
    await page
      .getByRole("tab", { exact: true, name: "Personalizadas" })
      .click();
    await page.getByRole("button", { name: "Nova regra" }).click();
    const createDialog = page.getByRole("dialog", {
      name: "Nova regra automática",
    });
    await createDialog.getByLabel("Nome da regra").fill("Rascunho protegido");
    await createDialog.getByRole("button", { name: "Fechar" }).click();

    let discardDialog = page.getByRole("dialog", {
      name: "Descartar alterações?",
    });
    await expect(discardDialog).toBeVisible();
    await discardDialog.getByRole("button", { name: "Cancelar" }).click();
    await expect(createDialog.getByLabel("Nome da regra")).toHaveValue(
      "Rascunho protegido",
    );

    await createDialog.getByRole("button", { name: "Fechar" }).click();
    discardDialog = page.getByRole("dialog", { name: "Descartar alterações?" });
    await discardDialog
      .getByRole("button", { name: "Descartar alterações" })
      .click();
    await expect(createDialog).toHaveCount(0);
  });

  test("validates boundaries and exercises the editable option matrix", async ({
    page,
    request,
  }, testInfo) => {
    await loginAs(page, qaPersonas.owner, testInfo);
    await page.goto("/auto-entries");
    await runAutoEntryOptionMatrix(page, request);
  });

  test("finance reader stays read-only, accessible and viewport-safe on mobile", async ({
    page,
    request,
  }, testInfo) => {
    const name = `Leitura móvel QA ${Date.now()}`;
    try {
      await createRuleViaApi(request, name);
      await loginAs(page, qaPersonas.salesman, testInfo);
      await page.emulateMedia({ reducedMotion: "reduce" });
      await setQaViewport(page, "mobile");
      await page.goto("/auto-entries");

      await expect(page.getByText("Somente leitura")).toBeVisible();
      await page
        .getByRole("tab", { exact: true, name: "Personalizadas" })
        .click();
      const card = ruleCard(page, name);
      await expect(card).toBeVisible();
      await expect(
        card.getByRole("switch", { name: `Ativar regra ${name}` }),
      ).toBeDisabled();
      await expect(
        page.getByRole("button", {
          name: /Nova regra|Editar regra|Excluir regra/,
        }),
      ).toHaveCount(0);
      await expectViewportSafe(page);
      await expectAccessible(page);
      await saveQaScreenshot(page, testInfo, "auto-entries-read-only-mobile");
    } finally {
      await cleanupRules(request, [name]);
    }
  });
});
