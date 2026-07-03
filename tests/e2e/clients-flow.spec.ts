import { expect, test, type Locator, type Page } from "@playwright/test";
import { saveQaScreenshot } from "./support/artifacts";
import { installLocalSession } from "./support/auth";
import {
  collectPageDiagnostics,
  expectNoPageCrashes,
} from "./support/diagnostics";
import { qaPersonas } from "./support/personas";
import { setQaViewport } from "./support/viewports";

const ownerClientPermissions = [
  "inventory.read",
  "lead.create",
  "lead.read",
  "lead.update",
];

test.describe("clients feature flow", () => {
  test.beforeEach(async ({ page }) => {
    await blockSeedAssetRequests(page);
  });

  test("covers owner list, filters, create, detail tabs, and mobile layout", async ({
    page,
  }, testInfo) => {
    const diagnostics = collectPageDiagnostics(page);
    const leadName = `Cliente QA ${Date.now()}`;

    await setQaViewport(page, "desktop");
    await installLocalSession(page, {
      permissions: ownerClientPermissions,
      persona: qaPersonas.owner,
    });
    await page.goto("/dashboard");
    await expect(page).toHaveURL(/\/dashboard$/);
    await page.getByRole("button", { name: "Clientes" }).click();

    await expect(page.getByRole("heading", { name: "Clientes" })).toBeVisible();
    await expect(page.getByText("Ana Silva")).toBeVisible();
    await expect(page.getByText("Marcos Lima")).toBeVisible();
    await saveQaScreenshot(page, testInfo, "clients-list-kanban-desktop");

    await page.getByPlaceholder("Buscar negócios...").fill("Marcos");
    await expect(page.getByText("Marcos Lima")).toBeVisible();
    await saveQaScreenshot(page, testInfo, "clients-list-search-filter");

    await page.getByPlaceholder("Buscar negócios...").fill("sem resultado qa");
    await expect(
      page.getByText("Nenhum negócio encontrado para os filtros ativos."),
    ).toBeVisible();
    await saveQaScreenshot(page, testInfo, "clients-list-empty-filter");

    await page.getByPlaceholder("Buscar negócios...").fill("");
    await switchToListView(page);
    await expect(page.getByRole("table")).toBeVisible();
    await saveQaScreenshot(page, testInfo, "clients-list-table-desktop");

    await openNewDeal(page);
    await expect(
      page.getByRole("heading", { name: "Novo negócio" }),
    ).toBeVisible();
    await page.getByLabel("Nome do contato").fill(leadName);
    await page.getByLabel("Telefone").fill("(11) 98888-4444");
    await page.getByLabel("E-mail").fill("cliente.qa@example.com");
    const vehicleSelect = page.getByLabel("Veículos de Interesse");
    await vehicleSelect.selectOption({ index: 1 });
    const selectedVehicleLabel =
      (await vehicleSelect.locator("option:checked").textContent())?.trim() ??
      "";
    const selectedVehiclePrefix = selectedVehicleLabel
      .split(/\s+/)
      .slice(0, 4)
      .join(" ");
    expect(selectedVehiclePrefix.length).toBeGreaterThan(0);
    await page.getByRole("button", { name: "Mais opções" }).click();
    await page.getByLabel("Observações").fill("Criado pelo fluxo QA clients.");
    await saveQaScreenshot(page, testInfo, "clients-create-modal");
    await page.getByRole("button", { name: "Criar" }).click();

    await expect(page.getByRole("heading", { name: leadName })).toBeVisible();
    await expect(page.getByText("(11) 98888-4444")).toBeVisible();
    await expect(page.getByText("cliente.qa@example.com")).toBeVisible();
    await expect(
      page.getByText(new RegExp(escapeRegExp(selectedVehiclePrefix))).first(),
    ).toBeVisible();
    await saveQaScreenshot(page, testInfo, "clients-detail-created");

    await page
      .getByRole("button", { name: `Alterar fase de ${leadName}` })
      .click();
    await page.getByRole("button", { name: "Qualificado" }).click();
    await expect(page.getByText("Qualificado").first()).toBeVisible();

    for (const tabName of [
      "Visão geral",
      "Chat",
      "Tarefas",
      "Reuniões",
      "Notas",
      "Financiamento",
      "Arquivos",
      "Seguro",
      "Portal",
    ]) {
      await selectDetailTab(page, tabName);
    }
    await saveQaScreenshot(page, testInfo, "clients-detail-tabs");

    await goBackToClientsList(page);
    await setQaViewport(page, "mobile");
    await expect(page.getByRole("heading", { name: "Clientes" })).toBeVisible();
    await expectControlInsideViewport(
      page,
      page.getByRole("button", { name: "Novo pipeline" }),
    );
    await expectControlInsideViewport(
      page,
      page.getByRole("button", { name: "Configurar" }),
    );
    await expect(page.getByText(/Criado \d+ min atrás/).first()).toBeVisible();
    await saveQaScreenshot(page, testInfo, "clients-list-mobile");
    expectNoPageCrashes(diagnostics);
  });

  test("shows restricted-state copy when lead.read is missing", async ({
    page,
  }, testInfo) => {
    await installLocalSession(page, {
      permissions: ["inventory.read"],
      persona: qaPersonas.owner,
    });

    await page.goto("/dashboard#/crm?surface=leads");
    await expect(
      page.getByRole("heading", { name: "Acesso restrito" }),
    ).toBeVisible();
    await expect(
      page.getByText(/Seu perfil não tem acesso a clientes/),
    ).toBeVisible();
    await saveQaScreenshot(page, testInfo, "clients-permission-restricted");
  });

  test("shows API error state without leaking backend details", async ({
    page,
  }, testInfo) => {
    await installLocalSession(page, {
      permissions: ["lead.read"],
      persona: qaPersonas.owner,
    });
    await page.route("**/api/v1/crm/leads**", async (route) => {
      await route.fulfill({
        body: JSON.stringify({
          code: "CRM_QA_FAILURE",
          message: "Forced QA clients failure.",
          requestId: "req_pw_clients_list",
        }),
        headers: {
          "content-type": "application/json",
          "x-request-id": "req_pw_clients_list",
        },
        status: 500,
      });
    });

    await page.goto("/dashboard#/crm?surface=leads");
    await expect(page.getByRole("heading", { name: "Clientes" })).toBeVisible();
    await expect(page.getByText(/Erro interno do servidor/)).toBeVisible();
    await expect(
      page.getByText("ID do erro: req_pw_clients_list"),
    ).toBeVisible();
    await saveQaScreenshot(page, testInfo, "clients-list-api-error");
  });
});

async function blockSeedAssetRequests(page: Page) {
  await page.route(
    "https://assets-v2.lojaveiculos.com.br/**",
    async (route) => {
      await route.fulfill({
        body: `<svg xmlns="http://www.w3.org/2000/svg" width="160" height="90" />`,
        contentType: "image/svg+xml",
        status: 200,
      });
    },
  );
}

async function switchToListView(page: Page) {
  const accessibleButton = page.getByRole("button", { name: "Exibir lista" });
  await expect.soft(accessibleButton).toBeVisible({ timeout: 1_000 });
  if (await accessibleButton.count()) {
    await accessibleButton.click();
    return;
  }

  await page
    .locator(".crm-pipeline-toolbar")
    .locator(".flex.items-center.border button")
    .nth(1)
    .click();
}

async function openNewDeal(page: Page) {
  await page.getByRole("button", { name: "Nova negociação" }).click();
}

async function goBackToClientsList(page: Page) {
  const accessibleButton = page.getByRole("button", {
    name: "Voltar para clientes",
  });
  await expect.soft(accessibleButton).toBeVisible({ timeout: 1_000 });
  if (await accessibleButton.count()) {
    await accessibleButton.click();
    return;
  }

  await page.locator(".crm-client-detail header button").first().click();
}

async function selectDetailTab(page: Page, tabName: string) {
  const accessibleTab = page.getByRole("tab", { name: tabName });
  await expect.soft(accessibleTab).toBeVisible({ timeout: 1_000 });
  if (await accessibleTab.count()) {
    await accessibleTab.click();
    await expect(accessibleTab).toHaveAttribute("aria-selected", "true");
    return;
  }

  await page.getByRole("button", { name: tabName }).click();
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

async function expectControlInsideViewport(page: Page, locator: Locator) {
  await expect(locator).toBeVisible();
  const box = await locator.boundingBox();
  const viewport = page.viewportSize();

  expect(box).not.toBeNull();
  expect(viewport).not.toBeNull();
  expect(box!.x).toBeGreaterThanOrEqual(0);
  expect(box!.x + box!.width).toBeLessThanOrEqual(viewport!.width);
}
