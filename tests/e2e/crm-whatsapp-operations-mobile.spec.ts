import { expect, test, type Page, type Route } from "@playwright/test";
import {
  installCampaignApiMocks,
  installNoopCampaignEventSource,
} from "./crm-whatsapp-campaigns-helpers";
import { createCampaignConnection } from "./crm-whatsapp-campaigns-fixtures";
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
    await installPairingConnectionMocks(page);
    await page.goto("/crm#/crm?surface=conversations");

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
    await expect(
      mobileNav.getByRole("group", { name: "Outras áreas do CRM" }),
    ).toBeVisible();
    await expectMoreMenuAboveNavigation(page);
    await saveQaScreenshot(page, testInfo, "crm-whatsapp-more-mobile");
    await mobileNav.getByRole("button", { name: "Conexão" }).click();
    const connection = page.getByRole("region", { name: /Conexão/i });
    await expect(
      connection.getByRole("heading", { name: /Conectar WhatsApp.*Z-API/ }),
    ).toBeVisible();
    await expect(
      connection.getByRole("tab", { name: "QR Code" }),
    ).toBeVisible();
    await expect(
      connection.getByRole("button", { name: "Gerar QR Code" }),
    ).toBeVisible();
    await expect(
      connection.getByText("Atualização automática ativa"),
    ).toBeVisible();
    await expect(connection.getByText("Credenciais protegidas")).toHaveCount(0);
    await expect(
      connection.getByLabel(/ID da instância|Token da instância/i),
    ).toHaveCount(0);
    await expect(connection.getByText(/webhook/i)).toHaveCount(0);
    await expect(
      connection.getByRole("button", { name: /configurar|webhook/i }),
    ).toHaveCount(0);

    await connection.getByRole("button", { name: "Gerar QR Code" }).click();
    await expect(
      connection.getByAltText("QR Code para conectar o WhatsApp"),
    ).toBeVisible();
    await connection.getByRole("tab", { name: "Código do telefone" }).click();
    await expect(
      connection.getByLabel("Telefone para pareamento"),
    ).toBeVisible();
    await connection
      .getByLabel("Telefone para pareamento")
      .fill("+55 (11) 99999-9999");
    await connection.getByRole("button", { name: "Solicitar código" }).click();
    await expect(
      connection.locator("output").filter({ hasText: "5511999999999" }),
    ).toBeVisible();
    await expectNoPageOverflow(page);
    await saveQaScreenshot(page, testInfo, "crm-whatsapp-connection-mobile");
  });
});

async function installPairingConnectionMocks(page: Page) {
  const connection = createCampaignConnection();
  await page.route("**/crm/whatsapp/connections", (route) =>
    fulfillJson(route, {
      allowance: { limit: 1, remaining: 0, used: 1 },
      availableProviders: [],
      connections: [
        {
          ...connection,
          credentials: {
            apiBaseUrlEnv: null,
            clientTokenEnv: null,
            instanceIdEnv: null,
            instanceTokenEnv: null,
            mode: "stored",
            storedInstanceConfigured: true,
          },
          externalInstanceId: "stored-instance",
          id: "connection-pairing-mobile-e2e",
          live: {
            checkedAt: "2026-08-10T12:00:00.000Z",
            connected: false,
            connectedPhone: null,
            providerStatus: "disconnected",
            smartphoneConnected: false,
          },
          phone: null,
          ready: false,
          setup: {
            attemptCount: 1,
            configuredAt: "2026-08-10T12:00:00.000Z",
            lastErrorCode: null,
            requestedAt: "2026-08-10T11:59:00.000Z",
            requiredTypes: [
              "received",
              "delivery",
              "status",
              "connected",
              "disconnected",
              "chat-presence",
            ],
            status: "configured",
            succeededTypes: [
              "received",
              "delivery",
              "status",
              "connected",
              "disconnected",
              "chat-presence",
            ],
            supportCode: "ZAPI-MOBILE-E2E",
            updatedAt: "2026-08-10T12:00:00.000Z",
            version: 1,
          },
          status: "disconnected",
        },
      ],
    }),
  );
  await page.route(
    "**/crm/whatsapp/connections/connection-pairing-mobile-e2e/zapi/pairing/qr",
    (route) =>
      fulfillJson(route, {
        expiresAt: "2099-08-10T12:00:00.000Z",
        qrCode: "data:image/png;base64,crm-pairing-qr-mobile",
      }),
  );
  await page.route(
    "**/crm/whatsapp/connections/connection-pairing-mobile-e2e/zapi/pairing/code",
    (route) =>
      fulfillJson(route, {
        code: "5511999999999",
        expiresAt: "2099-08-10T12:00:00.000Z",
        requested: true,
      }),
  );
}

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
  await navigation
    .getByRole("group", { name: "Outras áreas do CRM" })
    .getByRole("button", { name })
    .click();
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
      leftGap: bounds.left,
      minimumTargetHeight: Math.min(...targets.map((target) => target.height)),
      rightGap: window.innerWidth - bounds.right,
      top: bounds.top,
    };
  });
  expect(result.bottomGap).toBeGreaterThanOrEqual(0);
  expect(result.bottomGap).toBeLessThanOrEqual(24);
  expect(result.leftGap).toBeGreaterThanOrEqual(0);
  expect(result.rightGap).toBeGreaterThanOrEqual(0);
  expect(result.top).toBeGreaterThanOrEqual(0);
  expect(result.minimumTargetHeight).toBeGreaterThanOrEqual(44);
}

async function expectMoreMenuAboveNavigation(page: Page) {
  const navigation = getMobileNavigation(page);
  const menu = navigation.getByRole("group", {
    name: "Outras áreas do CRM",
  });
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
