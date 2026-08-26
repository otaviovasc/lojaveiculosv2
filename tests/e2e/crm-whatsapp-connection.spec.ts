import { expect, test } from "@playwright/test";
import {
  installCampaignApiMocks,
  installNoopCampaignEventSource,
} from "./crm-whatsapp-campaigns-helpers";
import { saveQaScreenshot } from "./support/artifacts";
import { setQaViewport } from "./support/viewports";

test.describe("CRM WhatsApp connection", () => {
  test("offers store-scoped Z-API BYOK without a billing step", async ({
    page,
  }, testInfo) => {
    await setQaViewport(page, "desktop");
    await installLocalCrmOwnerAuth(page);
    await installNoopCampaignEventSource(page);
    await installCampaignApiMocks(page);

    await page.route("**/api/v1/crm/channel-connections", (route) =>
      route.fulfill({
        body: JSON.stringify({
          allowance: { limit: 0, remaining: 0, used: 0 },
          availableSetups: [
            { broker: "direct", channel: "whatsapp", provider: "zapi" },
          ],
          connections: [],
        }),
        headers: { "content-type": "application/json" },
        status: 200,
      }),
    );
    await openCrmConnectionDirectory(page);

    const connection = page.getByRole("region", { name: "Conexões" });
    const zapiCard = connection.locator('button[data-provider="zapi"]');
    await expect(zapiCard).toBeVisible();
    await zapiCard.click();
    const dialog = page.getByRole("dialog");
    await expect(dialog.getByLabel("ID da instância")).toBeVisible();
    await expect(dialog.getByLabel("Token da instância")).toBeVisible();
    await expect(dialog.getByLabel("Client-Token")).toBeVisible();
    await expect(dialog.getByText(/pagamento|add-on|assinatura/i)).toHaveCount(
      0,
    );
    await saveQaScreenshot(page, testInfo, "crm-whatsapp-connection-zapi-byok");
  });

  test("requires three new credentials for a migrated incomplete connection", async ({
    page,
  }, testInfo) => {
    await setQaViewport(page, "desktop");
    await installLocalCrmOwnerAuth(page);
    await installNoopCampaignEventSource(page);
    await installCampaignApiMocks(page);
    await page.route("**/api/v1/crm/channel-connections", (route) =>
      route.fulfill({
        body: JSON.stringify({
          allowance: { limit: 1, remaining: 0, used: 1 },
          availableSetups: [],
          connections: [
            {
              displayName: "Z-API E2E",
              id: "connection-zapi",
              channel: "whatsapp",
              provider: "zapi",
              state: "disconnected",
              revision: 7,
              readiness: {
                ready: false,
                reasonCode: "not_authorized",
                reason: "credentials_incomplete",
              },
              capabilities: [],
              isDefault: false,
              live: {
                checkedAt: "2026-08-10T12:00:00.000Z",
                connected: false,
                connectedPhone: null,
                providerStatus: "disconnected",
                smartphoneConnected: false,
              },
              setup: {
                attemptCount: 0,
                configuredAt: null,
                lastErrorCode: null,
                leaseExpiresAt: null,
                leaseOwner: null,
                requestedAt: "2026-08-10T12:00:00.000Z",
                requiredTypes: [],
                status: "configured",
                succeededTypes: [],
                supportCode: "ZAPI-E2E",
                updatedAt: "2026-08-10T12:00:00.000Z",
                version: 2,
              },
            },
          ],
        }),
        headers: { "content-type": "application/json" },
        status: 200,
      }),
    );
    await openCrmConnectionDirectory(page);

    const directory = page.getByRole("region", { name: "Conexões" });
    await directory.locator('button[data-provider="zapi"]').click();
    const connection = page.getByRole("dialog");
    await expect(
      connection.getByRole("heading", {
        name: "Atualizar credenciais da Z-API",
      }),
    ).toBeVisible();
    await expect(connection.getByLabel("ID da instância")).toBeVisible();
    await expect(connection.getByLabel("Token da instância")).toBeVisible();
    await expect(connection.getByLabel("Client-Token")).toBeVisible();
    await saveQaScreenshot(
      page,
      testInfo,
      "crm-whatsapp-credentials-incomplete",
    );
  });

  test("shows honest channel directory states on desktop", async ({
    page,
  }, testInfo) => {
    await setQaViewport(page, "desktop");
    await installLocalCrmOwnerAuth(page);
    await installNoopCampaignEventSource(page);
    await installCampaignApiMocks(page);
    await page.route("**/api/v1/crm/channel-connections", (route) =>
      route.fulfill({
        body: JSON.stringify({
          allowance: { limit: 0, remaining: 0, used: 0 },
          availableSetups: [
            { broker: "direct", channel: "whatsapp", provider: "zapi" },
          ],
          connections: [],
        }),
        headers: { "content-type": "application/json" },
        status: 200,
      }),
    );
    await openCrmConnectionDirectory(page);

    const connection = page.getByRole("region", { name: "Conexões" });
    const directory = connection.getByRole("list", {
      name: "Canais conectados e disponíveis de WhatsApp",
    });
    const zapiCard = directory.locator('button[data-provider="zapi"]');

    // Z-API remains an actionable CRM transport with store-owned credentials.
    await expect(zapiCard).toBeVisible();
    await expect(directory.getByText("Credencial da loja")).toBeVisible();

    // Official WhatsApp is honestly unavailable: no button, no CTA.
    await expect(directory.getByText("WhatsApp Oficial")).toBeVisible();
    await expect(directory.getByText("Indisponível")).toBeVisible();
    await expect(
      directory.getByText("Nenhuma operação oficial foi iniciada."),
    ).toBeVisible();
    await expect(
      directory.getByRole("button", { name: /WhatsApp Oficial/ }),
    ).toHaveCount(0);
    await expect(directory.locator('[aria-disabled="true"]')).toHaveCount(1);

    // Instagram is honestly unavailable when the server offers no setup.
    const instagram = connection.getByRole("region", { name: "Instagram" });
    await expect(instagram.getByText("Instagram Oficial")).toBeVisible();
    await expect(instagram.getByText("Indisponível")).toBeVisible();
    await expect(
      instagram.getByRole("link", { name: "Pedir ajuda para configurar" }),
    ).toHaveCount(0);

    await saveQaScreenshot(
      page,
      testInfo,
      "crm-whatsapp-connection-channel-directory",
    );
  });

  test("posts first-time Z-API credentials and shows the webhook stage", async ({
    page,
  }, testInfo) => {
    await setQaViewport(page, "desktop");
    await installLocalCrmOwnerAuth(page);
    await installNoopCampaignEventSource(page);
    await installCampaignApiMocks(page);

    let connectionCreated = false;
    const createdConnection = {
      displayName: "Z-API E2E",
      id: "connection-zapi-e2e",
      channel: "whatsapp",
      provider: "zapi",
      state: "sandbox",
      readiness: {
        ready: false,
        reasonCode: "pending_webhook",
        reason: "Aguardando configuração do webhook.",
      },
      capabilities: [],
      isDefault: false,
      live: {
        checkedAt: "2026-08-10T12:00:00.000Z",
        connected: false,
        connectedPhone: null,
        providerStatus: "disconnected",
        smartphoneConnected: false,
      },
      phone: null,
      provider: "zapi",
      ready: false,
      setup: {
        attemptCount: 1,
        configuredAt: null,
        lastErrorCode: null,
        leaseExpiresAt: null,
        leaseOwner: null,
        requestedAt: "2026-08-10T12:00:00.000Z",
        requiredTypes: ["received", "delivery"],
        status: "configuring",
        succeededTypes: [],
        supportCode: "ZAPI-E2E",
        updatedAt: "2026-08-10T12:00:00.000Z",
        version: 2,
      },
    };
    await page.route("**/api/v1/crm/channel-connections", async (route) => {
      const request = route.request();
      if (request.method() === "POST") {
        connectionCreated = true;
        await route.fulfill({
          body: JSON.stringify(createdConnection),
          headers: { "content-type": "application/json" },
          status: 201,
        });
        return;
      }
      await route.fulfill({
        body: JSON.stringify({
          allowance: {
            limit: 1,
            remaining: connectionCreated ? 0 : 1,
            used: 0,
          },
          availableSetups: connectionCreated
            ? []
            : [{ broker: "direct", channel: "whatsapp", provider: "zapi" }],
          connections: connectionCreated ? [createdConnection] : [],
        }),
        headers: { "content-type": "application/json" },
        status: 200,
      });
    });
    await openCrmConnectionDirectory(page);

    const directory = page.getByRole("region", { name: "Conexões" });
    await directory.locator('button[data-provider="zapi"]').click();
    const connection = page.getByRole("dialog");

    // Base CRM entitlement exposes the first-time BYOK form directly.
    await expect(
      connection.getByRole("heading", {
        name: "Credenciais da instância Z-API",
      }),
    ).toBeVisible();
    const createRequest = page.waitForRequest(
      "**/api/v1/crm/channel-connections",
      (candidate) => candidate.method() === "POST",
    );
    await connection.getByLabel("ID da instância").fill("3E2E-INSTANCE");
    await connection
      .getByLabel("Token da instância")
      .fill("instance-token-e2e");
    await connection.getByLabel("Client-Token").fill("client-token-e2e");
    await connection
      .getByRole("button", { name: "Salvar credenciais" })
      .click();

    const posted = createRequest.then((request) =>
      JSON.parse(request.postData() ?? "{}"),
    );
    await expect.poll(async () => (await posted).provider).toBe("zapi");
    expect(await posted).toMatchObject({
      clientToken: "client-token-e2e",
      instanceId: "3E2E-INSTANCE",
      instanceToken: "instance-token-e2e",
      provider: "zapi",
    });

    // After the create response, the automatic webhook configuration stage
    // replaces the credential form.
    await expect(
      connection.getByText("Configurando os webhooks automaticamente"),
    ).toBeVisible();
    await expect(connection.getByLabel("ID da instância")).toHaveCount(0);
    await expect(connection.getByLabel("Token da instância")).toHaveCount(0);
    await expect(connection.getByLabel("Client-Token")).toHaveCount(0);
    await saveQaScreenshot(
      page,
      testInfo,
      "crm-whatsapp-connection-zapi-webhook-setup",
    );
  });

  test("keeps connection status controls usable on a 390x844 mobile viewport", async ({
    page,
  }, testInfo) => {
    await setQaViewport(page, "mobile");
    await installLocalCrmOwnerAuth(page);
    await installNoopCampaignEventSource(page);
    await installCampaignApiMocks(page);
    await page.route("**/api/v1/crm/channel-connections", (route) =>
      route.fulfill({
        body: JSON.stringify({
          allowance: { limit: 1, remaining: 0, used: 1 },
          availableSetups: [],
          connections: [
            {
              displayName: "Z-API E2E",
              id: "connection-zapi",
              channel: "whatsapp",
              provider: "zapi",
              state: "active",
              readiness: {
                ready: true,
                reasonCode: "ready",
                reason: null,
              },
              capabilities: ["outbound", "text"],
              isDefault: false,
              live: {
                checkedAt: "2026-08-10T12:00:00.000Z",
                connected: true,
                connectedPhone: "5511999999999",
                providerStatus: "connected",
                smartphoneConnected: true,
              },
              setup: {
                attemptCount: 0,
                configuredAt: null,
                lastErrorCode: null,
                leaseExpiresAt: null,
                leaseOwner: null,
                requestedAt: "2026-08-10T12:00:00.000Z",
                requiredTypes: [],
                status: "configured",
                succeededTypes: [],
                supportCode: "ZAPI-E2E",
                updatedAt: "2026-08-10T12:00:00.000Z",
                version: 2,
              },
            },
          ],
        }),
        headers: { "content-type": "application/json" },
        status: 200,
      }),
    );
    await openCrmConnectionDirectory(page);

    const directory = page.getByRole("region", { name: "Conexões" });
    await directory.locator('button[data-provider="zapi"]').click();
    const connection = page.getByRole("dialog");
    await expect(
      connection.getByRole("heading", { name: "WhatsApp · Z-API E2E" }),
    ).toBeVisible();
    await expect(
      connection.getByRole("button", { name: "Atualizar status da conexão" }),
    ).toBeVisible();

    const horizontalOverflow = await page.evaluate(
      () =>
        document.documentElement.scrollWidth -
        document.documentElement.clientWidth,
    );
    expect(horizontalOverflow).toBeLessThanOrEqual(0);

    await connection
      .getByRole("button", { name: "Atualizar status da conexão" })
      .scrollIntoViewIfNeeded();
    await saveQaScreenshot(
      page,
      testInfo,
      "crm-whatsapp-connection-pairing-mobile",
    );
  });
});

async function openCrmConnectionDirectory(
  page: import("@playwright/test").Page,
) {
  await page.goto("/crm#/crm?surface=conversations&scope=connection");
  await expect(page.getByRole("region", { name: "Conexões" })).toBeVisible();
}

async function installLocalCrmOwnerAuth(page: import("@playwright/test").Page) {
  await page.addInitScript(() => {
    localStorage.setItem(
      "lojaveiculosv2:local-auth-user-id",
      "clerk_seed_owner",
    );
  });
}
