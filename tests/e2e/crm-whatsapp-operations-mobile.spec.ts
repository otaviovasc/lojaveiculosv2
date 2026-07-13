import { expect, test, type Page, type Route } from "@playwright/test";
import {
  installCampaignApiMocks,
  installNoopCampaignEventSource,
} from "./crm-whatsapp-campaigns-helpers";
import { installLocalOwnerSession } from "./crm-whatsapp-test-helpers";
import { saveQaScreenshot } from "./support/artifacts";
import { setQaViewport } from "./support/viewports";

test.describe("CRM WhatsApp operations mobile", () => {
  test("keeps every operations workflow focused and inside the viewport", async ({
    page,
  }, testInfo) => {
    await setQaViewport(page, "mobile");
    await installLocalOwnerSession(page);
    await installNoopCampaignEventSource(page);
    await installCampaignApiMocks(page);
    await installOperationsMocks(page);
    await page.goto("/crm#/crm?surface=whatsapp");

    await expectMobileNavigation(page);

    await selectMobileScope(page, "Agendar mensagem");
    await page.getByRole("button", { name: "Novo agendamento" }).click();
    await expect(
      page.getByRole("heading", { name: "Escolha a conversa" }),
    ).toBeVisible();
    await expectNoPageOverflow(page);
    await expectWorkflowFooterAboveNavigation(page);
    await saveQaScreenshot(page, testInfo, "crm-whatsapp-schedule-mobile");
    await page.getByRole("button", { name: "Cancelar" }).click();

    await selectMobileScope(page, "Campanhas");
    await page.getByRole("button", { name: "Nova campanha" }).click();
    await expect(
      page.getByRole("heading", { exact: true, name: "Mensagem" }),
    ).toBeVisible();
    await expectNoPageOverflow(page);
    await expectWorkflowFooterAboveNavigation(page);
    await saveQaScreenshot(page, testInfo, "crm-whatsapp-campaign-mobile");
    await page.getByRole("button", { name: "Cancelar" }).click();

    await selectMobileScope(page, "Visitas");
    await page.getByRole("button", { name: "Nova visita" }).click();
    await expect(
      page.getByRole("heading", { name: "Confirme o cliente" }),
    ).toBeVisible();
    await expectNoPageOverflow(page);
    await expectWorkflowFooterAboveNavigation(page);
    await saveQaScreenshot(page, testInfo, "crm-whatsapp-visit-mobile");
    await page.getByRole("button", { name: "Cancelar" }).click();

    await selectMobileScope(page, "Etiquetas");
    await page.getByRole("button", { name: "Nova etiqueta" }).click();
    await expect(
      page.getByRole("dialog", { name: "Nova etiqueta" }),
    ).toBeVisible();
    await expectNoPageOverflow(page);
    await saveQaScreenshot(page, testInfo, "crm-whatsapp-tag-mobile");
    await page.getByRole("button", { name: "Cancelar" }).click();

    await selectMobileScope(page, "Integrações");
    await expect(
      page.getByRole("heading", { name: "Bot externo" }),
    ).toBeVisible();
    await expectNoPageOverflow(page);
    await saveQaScreenshot(page, testInfo, "crm-whatsapp-integration-mobile");

    const mobileNav = getMobileNavigation(page);
    await mobileNav.getByRole("button", { name: "Mais" }).click();
    await expect(mobileNav.getByRole("menu")).toBeVisible();
    await expectMoreMenuAboveNavigation(page);
    await saveQaScreenshot(page, testInfo, "crm-whatsapp-more-mobile");
    await mobileNav.getByRole("menuitem", { name: "Conexão" }).click();
    await expect(page.getByText("Credenciais protegidas")).toBeVisible();
    await expectNoPageOverflow(page);
    await saveQaScreenshot(page, testInfo, "crm-whatsapp-connection-mobile");
  });
});

async function installOperationsMocks(page: Page) {
  await page.route("**/crm/whatsapp/scheduled-messages**", (route) =>
    fulfillJson(route, []),
  );
  await page.route("**/crm/visits**", (route) =>
    fulfillJson(route, { visits: [] }),
  );
  await page.route("**/crm/whatsapp/integrations/bot", (route) =>
    fulfillJson(route, {
      integration: {
        createdAt: "2026-07-07T12:00:00.000Z",
        enabled: true,
        id: "bot-mobile",
        secretConfigured: true,
        secretUpdatedAt: "2026-07-07T12:00:00.000Z",
        updatedAt: "2026-07-07T12:00:00.000Z",
        webhookUrl: "https://bot.example.test/webhook",
      },
    }),
  );
  await page.route("**/crm/whatsapp/provider-events/issues**", (route) =>
    fulfillJson(route, { events: [] }),
  );
}

async function fulfillJson(route: Route, body: unknown) {
  await route.fulfill({
    body: JSON.stringify(body),
    headers: { "content-type": "application/json" },
    status: 200,
  });
}

function getMobileNavigation(page: Page) {
  return page.getByRole("navigation", {
    name: "Navegação móvel do WhatsApp CRM",
  });
}

async function selectMobileScope(page: Page, name: string) {
  const navigation = getMobileNavigation(page);
  const directDestination = navigation.getByRole("button", {
    exact: true,
    name,
  });
  if ((await directDestination.count()) > 0) {
    await directDestination.click();
    return;
  }

  await navigation.getByRole("button", { name: "Mais" }).click();
  await navigation.getByRole("menuitem", { name }).click();
}

async function expectMobileNavigation(page: Page) {
  const navigation = getMobileNavigation(page);
  await expect(navigation).toBeVisible();
  const result = await navigation.evaluate((element) => {
    const bounds = element.getBoundingClientRect();
    const targets = [...element.querySelectorAll("button")].map((button) =>
      button.getBoundingClientRect(),
    );
    return {
      bottomGap: window.innerHeight - bounds.bottom,
      minimumTargetHeight: Math.min(...targets.map((target) => target.height)),
    };
  });
  expect(result.bottomGap).toBeGreaterThanOrEqual(0);
  expect(result.bottomGap).toBeLessThanOrEqual(24);
  expect(result.minimumTargetHeight).toBeGreaterThanOrEqual(44);
}

async function expectMoreMenuAboveNavigation(page: Page) {
  const navigation = getMobileNavigation(page);
  const menu = navigation.getByRole("menu");
  const [navigationBox, menuBox] = await Promise.all([
    navigation.boundingBox(),
    menu.boundingBox(),
  ]);
  expect(navigationBox).not.toBeNull();
  expect(menuBox).not.toBeNull();
  expect(menuBox!.y + menuBox!.height).toBeLessThanOrEqual(navigationBox!.y);
}

async function expectWorkflowFooterAboveNavigation(page: Page) {
  const footer = page.locator(".crm-whatsapp-workflow-footer");
  const navigation = getMobileNavigation(page);
  await expect(footer).toBeVisible();
  const [footerBox, navigationBox] = await Promise.all([
    footer.boundingBox(),
    navigation.boundingBox(),
  ]);
  expect(footerBox).not.toBeNull();
  expect(navigationBox).not.toBeNull();
  expect(footerBox!.y + footerBox!.height).toBeLessThanOrEqual(
    navigationBox!.y,
  );
}

async function expectNoPageOverflow(page: Page) {
  await expect
    .poll(() =>
      page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth + 1,
      ),
    )
    .toBe(true);
}
