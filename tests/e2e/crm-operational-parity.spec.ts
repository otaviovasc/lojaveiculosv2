import { expect, test } from "@playwright/test";
import { installOperationalCrm } from "./crm-operational-fixtures";
import { expectAccessible, expectViewportSafe } from "./support/uiQuality";
import { saveQaScreenshot } from "./support/artifacts";

test.use({ viewport: { width: 1440, height: 900 } });

test("CRM operational desktop and mobile layout", async ({
  page,
}, testInfo) => {
  await installOperationalCrm(page);
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/crm#/crm?surface=leads");
  await expect(
    page.getByRole("heading", { name: "ANA NASCIMENTO", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByLabel("Próxima tarefa: Retornar proposta do Civic (Atrasada)"),
  ).toBeVisible();
  await page.getByRole("button", { name: "Resposta", exact: true }).click();
  const responseQuery = page.waitForRequest(
    (request) =>
      request.url().includes("/leads/board") &&
      new URL(request.url()).searchParams.get("responseState") === "responded",
  );
  await page
    .getByRole("checkbox", { name: "Respondidos", exact: true })
    .check();
  await responseQuery;
  await expect(
    page.getByRole("heading", { name: "ANA NASCIMENTO", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Sem interação", exact: true })
    .click();
  const inactivityQuery = page.waitForRequest(
    (request) =>
      request.url().includes("/leads/board") &&
      new URL(request.url()).searchParams.get("inactiveDays") === "7",
  );
  await page
    .getByRole("checkbox", { name: "Mais de 7 dias", exact: true })
    .check();
  await inactivityQuery;
  await expect(
    page.getByRole("heading", { name: "ANA NASCIMENTO", exact: true }),
  ).toBeVisible();
  await expectViewportSafe(page);
  await expectAccessible(page);
  await saveQaScreenshot(page, testInfo, "crm-operational-desktop");
  await page.setViewportSize({ width: 390, height: 844 });
  await expectViewportSafe(page);
  await expectAccessible(page);
  await saveQaScreenshot(page, testInfo, "crm-operational-mobile");
  await page
    .getByRole("button", { name: "Sem interação", exact: true })
    .click();
  await page.setViewportSize({ width: 1440, height: 900 });
  await page
    .getByRole("button", { name: "Alternar para tema escuro", exact: true })
    .click();
  await page.evaluate(async () => {
    await new Promise(requestAnimationFrame);
    await Promise.all(
      document
        .getAnimations()
        .filter(
          (animation) => animation.effect?.getTiming().iterations !== Infinity,
        )
        .map((animation) => animation.finished.catch(() => undefined)),
    );
  });
  await expectAccessible(page);
  await saveQaScreenshot(page, testInfo, "crm-operational-dark-desktop");
  await page.setViewportSize({ width: 390, height: 844 });
  await expectViewportSafe(page);
  await expectAccessible(page);
  await saveQaScreenshot(page, testInfo, "crm-operational-dark-mobile");
});

test("task ordering and human triage reach the server and remain accessible", async ({
  page,
}, testInfo) => {
  const { boardQueries } = await installOperationalCrm(page);
  await page.goto("/crm#/crm?surface=leads");
  await expect(
    page.getByRole("heading", { name: "ANA NASCIMENTO", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Ordenar", exact: true }).click();
  await page
    .getByRole("button", { name: "Próxima tarefa", exact: true })
    .click();
  await expect.poll(() => boardQueries.at(-1)?.get("sortBy")).toBe("next_task");
  await page
    .getByRole("button", { name: "Atendimento humano", exact: true })
    .click();
  await page
    .getByRole("checkbox", { name: "Aguardando humano", exact: true })
    .click();
  await expect
    .poll(() => boardQueries.at(-1)?.get("humanAttendanceState"))
    .toBe("waiting_human");
  expect(boardQueries.at(-1)?.get("sortBy")).toBe("next_task");
  await expectAccessible(page);
  await expectViewportSafe(page);
  await saveQaScreenshot(page, testInfo, "crm-operational-filtered-desktop");
  await page.setViewportSize({ width: 390, height: 844 });
  await expectViewportSafe(page);
  await saveQaScreenshot(page, testInfo, "crm-operational-filtered-mobile");
  await page
    .getByRole("button", { name: "Atendimento humano", exact: true })
    .click();
  await page
    .getByRole("radio", { name: "Todos os atendimentos", exact: true })
    .click();
  await expect
    .poll(() => boardQueries.at(-1)?.get("humanAttendanceState"))
    .toBeNull();
});

test("CSV import previews invalid rows and reports confirmed server counts", async ({
  page,
}, testInfo) => {
  const { imports, boardQueries } = await installOperationalCrm(page);
  await page.goto("/crm#/crm?surface=leads");
  await page
    .getByRole("button", { name: "Importar leads em CSV", exact: true })
    .click();
  const dialog = page.getByRole("dialog", { name: "Importar Leads via CSV" });
  await dialog.locator('input[type="file"]').setInputFiles({
    name: "contatos.csv",
    mimeType: "text/csv",
    buffer: Buffer.from(
      "nome,telefone,email\nAna,11999999999,\nInvalido,,errado\nBia,,bia@example.com\n",
    ),
  });
  await expect(dialog.getByText("2 válidas", { exact: true })).toBeVisible();
  await expect(dialog.getByText("Linha 3:", { exact: true })).toBeVisible();
  await expectAccessible(page);
  await page.setViewportSize({ width: 390, height: 844 });
  await expectViewportSafe(page);
  await saveQaScreenshot(page, testInfo, "crm-import-preview-mobile");
  const before = boardQueries.length;
  await dialog
    .getByRole("button", { name: "Importar contatos válidos", exact: true })
    .click();
  await expect(
    dialog.getByText("Resultado da importação", { exact: true }),
  ).toBeVisible();
  expect(imports).toHaveLength(1);
  expect(imports[0]).toMatchObject({
    pipelineStageId: "new",
    rows: [
      { buyerName: "Ana", buyerPhone: "11999999999" },
      { buyerName: "Bia", buyerEmail: "bia@example.com" },
    ],
  });
  expect(imports[0]?.idempotencyKey).toEqual(expect.any(String));
  await expect.poll(() => boardQueries.length).toBeGreaterThan(before);
  await expectViewportSafe(page);
  await expectAccessible(page);
  await saveQaScreenshot(page, testInfo, "crm-import-result-mobile");
});

test("CSV retries reuse the key and server errors refer to original file lines", async ({
  page,
}) => {
  const { imports } = await installOperationalCrm(page);
  await page.route("**/api/v1/crm/leads/import", async (route) => {
    imports.push(route.request().postDataJSON());
    return imports.length === 1
      ? route.fulfill({
          status: 503,
          json: { error: { code: "UNAVAILABLE", message: "Tente novamente" } },
        })
      : route.fulfill({
          json: {
            created: 1,
            skipped: 0,
            errors: [{ row: 2, message: "Contato recusado" }],
          },
        });
  });
  await page.goto("/crm#/crm?surface=leads");
  await page
    .getByRole("button", { name: "Importar leads em CSV", exact: true })
    .click();
  const dialog = page.getByRole("dialog", { name: "Importar Leads via CSV" });
  await dialog.locator('input[type="file"]').setInputFiles({
    name: "contatos.csv",
    mimeType: "text/csv",
    buffer: Buffer.from(
      "nome,email\nAna,ana@example.com\nInvalido,errado\nBia,bia@example.com\n",
    ),
  });
  await dialog
    .getByRole("button", { name: "Importar contatos válidos", exact: true })
    .click();
  await dialog
    .getByRole("button", { name: "Tentar novamente", exact: true })
    .click();
  await expect(
    dialog.getByText("Resultado da importação", { exact: true }),
  ).toBeVisible();
  expect(imports).toHaveLength(2);
  expect(imports[1]).toEqual(imports[0]);
  await expect(dialog.getByText("Linha 4:", { exact: true })).toBeVisible();
  await expect(
    dialog.getByText("Contato recusado", { exact: false }),
  ).toBeVisible();
});

test("lead details show linked scheduled messages and confirm cancellation", async ({
  page,
}, testInfo) => {
  const { lead, scheduleQueries } = await installOperationalCrm(page);
  await page.goto("/crm#/crm?surface=leads");
  await page
    .getByRole("button", {
      name: "Abrir detalhes de Ana Nascimento",
      exact: true,
    })
    .click();
  await page.getByRole("tab", { name: "Tarefas", exact: true }).click();
  await expect(
    page.getByText("Olá Ana, posso confirmar sua visita amanhã?", {
      exact: true,
    }),
  ).toBeVisible();
  expect(scheduleQueries.at(-1)?.get("leadId")).toBe(lead.id);
  expect(scheduleQueries.at(-1)?.get("limit")).toBe("100");
  await expect(page.getByText("Pendente", { exact: true })).toBeVisible();
  await expectAccessible(page);
  await expectViewportSafe(page);
  await saveQaScreenshot(page, testInfo, "crm-lead-schedules-desktop");
  await page.setViewportSize({ width: 390, height: 844 });
  await expectViewportSafe(page);
  await saveQaScreenshot(page, testInfo, "crm-lead-schedules-mobile");
  await page.getByRole("button", { name: "Cancelar", exact: true }).click();
  await expect(page.getByText("Cancelada", { exact: true })).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Cancelar", exact: true }),
  ).toHaveCount(0);
});

test("operational actions respect store permissions", async ({ page }) => {
  const { scheduleQueries } = await installOperationalCrm(page, [
    "lead.create",
    "crm.scheduled_messages.read",
    "crm.scheduled_messages.cancel",
  ]);
  await page.goto("/crm#/crm?surface=leads");
  await expect(
    page.getByRole("heading", { name: "ANA NASCIMENTO", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Importar leads em CSV", exact: true }),
  ).toHaveCount(0);
  await page
    .getByRole("button", {
      name: "Abrir detalhes de Ana Nascimento",
      exact: true,
    })
    .click();
  await page.getByRole("tab", { name: "Tarefas", exact: true }).click();
  await expect(page.getByText("Sem tarefas", { exact: true })).toBeVisible();
  await expect(page.getByText(/Mensagens agendadas/)).toHaveCount(0);
  expect(scheduleQueries).toHaveLength(0);
});
