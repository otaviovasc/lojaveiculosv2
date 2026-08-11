import { expect, test } from "@playwright/test";
import {
  installCampaignApiMocks,
  installNoopCampaignEventSource,
} from "./crm-whatsapp-campaigns-helpers";
import { installLocalOwnerSession } from "./crm-whatsapp-test-helpers";
import { saveQaScreenshot } from "./support/artifacts";
import { setQaViewport } from "./support/viewports";

test.describe("CRM WhatsApp connection", () => {
  test("keeps Z-API visible and posts the server-backed request CTA", async ({
    page,
  }, testInfo) => {
    await setQaViewport(page, "desktop");
    await installLocalOwnerSession(page);
    await installNoopCampaignEventSource(page);
    await installCampaignApiMocks(page);

    await page.route("**/crm/whatsapp/connections", (route) =>
      route.fulfill({
        body: JSON.stringify({
          allowance: { limit: 0, remaining: 0, used: 0 },
          availableProviders: [],
          connections: [],
        }),
        headers: { "content-type": "application/json" },
        status: 200,
      }),
    );
    await page.route("**/billing/overview", (route) =>
      route.fulfill({
        body: JSON.stringify({}),
        headers: { "content-type": "application/json" },
        status: 200,
      }),
    );
    const request = page.waitForRequest(
      "**/billing/addons/zapi/request",
      (candidate) => candidate.method() === "POST",
    );
    await page.route("**/billing/addons/zapi/request", (route) =>
      route.fulfill({
        body: JSON.stringify({
          contract: {
            addonCode: "crm_zapi",
            cancellationScheduledFor: null,
            id: "zapi-contract-e2e",
            monthlyPriceCents: 24999,
            paidAt: null,
            scheduledFor: null,
            setupCompletedAt: null,
            status: "pending",
            storeId: "store-e2e",
            supportCode: null,
          },
        }),
        headers: { "content-type": "application/json" },
        status: 200,
      }),
    );

    await page.goto("/crm#/crm?surface=whatsapp");
    await page.getByRole("tab", { name: /Conexão/ }).click();

    const connection = page.getByRole("region", { name: "Conexão" });
    await expect(
      connection.getByRole("button", { name: /Z-API/ }),
    ).toBeVisible();
    await connection.getByRole("button", { name: /Z-API/ }).click();
    await expect(
      connection.getByRole("button", { name: "Solicitar Z-API" }),
    ).toBeVisible();
    await connection.getByRole("button", { name: "Solicitar Z-API" }).click();
    await request;
    await expect(
      connection.getByText("Aguardando confirmação de pagamento"),
    ).toBeVisible();
    await saveQaScreenshot(
      page,
      testInfo,
      "crm-whatsapp-connection-zapi-request",
    );
  });

  test("shows pairing only for a configured Z-API connection", async ({
    page,
  }, testInfo) => {
    await setQaViewport(page, "desktop");
    await installLocalOwnerSession(page);
    await installNoopCampaignEventSource(page);
    await installCampaignApiMocks(page);
    await page.route("**/crm/whatsapp/connections", (route) =>
      route.fulfill({
        body: JSON.stringify({
          allowance: { limit: 1, remaining: 0, used: 1 },
          availableProviders: [],
          connections: [
            {
              credentials: {
                apiBaseUrlEnv: null,
                clientTokenEnv: null,
                instanceIdEnv: null,
                instanceTokenEnv: null,
                mode: "stored",
                storedInstanceConfigured: true,
              },
              displayName: "Z-API E2E",
              externalConnectionId: null,
              externalInstanceId: "stored-instance",
              id: "connection-zapi",
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
                attemptCount: 0,
                configuredAt: null,
                lastErrorCode: null,
                requestedAt: "2026-08-10T12:00:00.000Z",
                requiredTypes: [],
                status: "configured",
                succeededTypes: [],
                supportCode: "ZAPI-E2E",
                updatedAt: "2026-08-10T12:00:00.000Z",
                version: 1,
              },
              status: "disconnected",
              webhookUrl: null,
            },
          ],
        }),
        headers: { "content-type": "application/json" },
        status: 200,
      }),
    );
    await page.route("**/billing/overview", (route) =>
      route.fulfill({
        body: JSON.stringify({}),
        headers: { "content-type": "application/json" },
        status: 200,
      }),
    );

    await page.goto("/crm#/crm?surface=whatsapp");
    await page.getByRole("tab", { name: /Conexão/ }).click();

    const connection = page.getByRole("region", { name: "Conexão" });
    await expect(
      connection.getByRole("heading", { name: "Conectar WhatsApp · Z-API" }),
    ).toBeVisible();
    await expect(
      connection.getByRole("button", { name: "Gerar QR Code" }),
    ).toBeVisible();
    await connection.getByRole("tab", { name: "Código do telefone" }).click();
    await expect(
      connection.getByLabel("Telefone para pareamento"),
    ).toBeVisible();
    await expect(connection.getByLabel("ID da instância")).toHaveCount(0);
    await expect(connection.getByLabel("Token da instância")).toHaveCount(0);
    await expect(connection.getByLabel("Token do cliente")).toHaveCount(0);
    await expect(connection.getByText(/webhook/i)).toHaveCount(0);
    await saveQaScreenshot(page, testInfo, "crm-whatsapp-connection-pairing");
  });

  test("shows honest channel directory states on desktop", async ({
    page,
  }, testInfo) => {
    await setQaViewport(page, "desktop");
    await installLocalOwnerSession(page);
    await installNoopCampaignEventSource(page);
    await installCampaignApiMocks(page);
    await page.route("**/crm/whatsapp/connections", (route) =>
      route.fulfill({
        body: JSON.stringify({
          allowance: { limit: 0, remaining: 0, used: 0 },
          availableProviders: ["zapi"],
          connections: [],
        }),
        headers: { "content-type": "application/json" },
        status: 200,
      }),
    );
    await page.route("**/billing/overview", (route) =>
      route.fulfill({
        body: JSON.stringify({ addonContracts: [] }),
        headers: { "content-type": "application/json" },
        status: 200,
      }),
    );

    await page.goto("/crm#/crm?surface=whatsapp");
    await page.getByRole("tab", { name: /Conexão/ }).click();

    const connection = page.getByRole("region", { name: "Conexão" });
    const directory = connection.getByRole("list", {
      name: "Adicionar canal",
    });

    // Z-API remains an actionable row with an honest optional-add-on note.
    await expect(
      directory.getByRole("button", { name: /Z-API/ }),
    ).toBeVisible();
    await expect(directory.getByText("Adicional opcional")).toBeVisible();

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

    // Instagram is support-assisted: badge plus support link, no setup CTA.
    await expect(directory.getByText("Instagram incluído")).toBeVisible();
    await expect(directory.getByText("Com a equipe")).toBeVisible();
    await expect(
      directory.getByRole("link", { name: "Pedir ajuda para configurar" }),
    ).toBeVisible();

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
    await installLocalOwnerSession(page);
    await installNoopCampaignEventSource(page);
    await installCampaignApiMocks(page);

    let connectionCreated = false;
    const createdConnection = {
      credentials: {
        apiBaseUrlEnv: null,
        clientTokenEnv: null,
        instanceIdEnv: null,
        instanceTokenEnv: null,
        mode: "stored",
        storedInstanceConfigured: true,
      },
      displayName: "Z-API E2E",
      externalConnectionId: null,
      externalInstanceId: "3E2E-INSTANCE",
      id: "connection-zapi-e2e",
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
        requestedAt: "2026-08-10T12:00:00.000Z",
        requiredTypes: ["received", "delivery"],
        status: "configuring",
        succeededTypes: [],
        supportCode: "ZAPI-E2E",
        updatedAt: "2026-08-10T12:00:00.000Z",
        version: 1,
      },
      status: "disconnected",
      webhookUrl: null,
    };
    await page.route("**/crm/whatsapp/connections", async (route) => {
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
          availableProviders: connectionCreated ? [] : ["zapi"],
          connections: connectionCreated ? [createdConnection] : [],
        }),
        headers: { "content-type": "application/json" },
        status: 200,
      });
    });
    await page.route("**/billing/overview", (route) =>
      route.fulfill({
        body: JSON.stringify({
          addonContracts: [
            {
              addonCode: "crm_zapi",
              cancellationScheduledFor: null,
              id: "zapi-contract-e2e",
              monthlyPriceCents: 24999,
              paidAt: "2026-08-10T12:00:00.000Z",
              scheduledFor: null,
              setupCompletedAt: null,
              status: "paid_awaiting_setup",
              storeId: "store-e2e",
              supportCode: null,
            },
          ],
        }),
        headers: { "content-type": "application/json" },
        status: 200,
      }),
    );

    await page.goto("/crm#/crm?surface=whatsapp");
    await page.getByRole("tab", { name: /Conexão/ }).click();

    const connection = page.getByRole("region", { name: "Conexão" });
    await connection.getByRole("button", { name: /Z-API/ }).click();

    // First-time credential form after paid_awaiting_setup.
    await expect(
      connection.getByRole("heading", {
        name: "Credenciais da instância Z-API",
      }),
    ).toBeVisible();
    const createRequest = page.waitForRequest(
      "**/crm/whatsapp/connections",
      (candidate) => candidate.method() === "POST",
    );
    await connection.getByLabel("ID da instância").fill("3E2E-INSTANCE");
    await connection
      .getByLabel("Token da instância")
      .fill("instance-token-e2e");
    await connection.getByLabel("Token do cliente").fill("client-token-e2e");
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
    await expect(connection.getByLabel("Token do cliente")).toHaveCount(0);
    await saveQaScreenshot(
      page,
      testInfo,
      "crm-whatsapp-connection-zapi-webhook-setup",
    );
  });

  test("keeps the guided pairing flow usable on a 390x844 mobile viewport", async ({
    page,
  }, testInfo) => {
    await setQaViewport(page, "mobile");
    await installLocalOwnerSession(page);
    await installNoopCampaignEventSource(page);
    await installCampaignApiMocks(page);
    await page.route("**/crm/whatsapp/connections", (route) =>
      route.fulfill({
        body: JSON.stringify({
          allowance: { limit: 1, remaining: 0, used: 1 },
          availableProviders: [],
          connections: [
            {
              credentials: {
                apiBaseUrlEnv: null,
                clientTokenEnv: null,
                instanceIdEnv: null,
                instanceTokenEnv: null,
                mode: "stored",
                storedInstanceConfigured: true,
              },
              displayName: "Z-API E2E",
              externalConnectionId: null,
              externalInstanceId: "stored-instance",
              id: "connection-zapi",
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
                attemptCount: 0,
                configuredAt: null,
                lastErrorCode: null,
                requestedAt: "2026-08-10T12:00:00.000Z",
                requiredTypes: [],
                status: "configured",
                succeededTypes: [],
                supportCode: "ZAPI-E2E",
                updatedAt: "2026-08-10T12:00:00.000Z",
                version: 1,
              },
              status: "disconnected",
              webhookUrl: null,
            },
          ],
        }),
        headers: { "content-type": "application/json" },
        status: 200,
      }),
    );
    await page.route("**/billing/overview", (route) =>
      route.fulfill({
        body: JSON.stringify({}),
        headers: { "content-type": "application/json" },
        status: 200,
      }),
    );

    await page.goto("/crm#/crm?surface=whatsapp");
    await page.getByRole("button", { name: "Mais" }).click();
    await page.getByRole("menuitem", { name: /Conexão/ }).click();

    const connection = page.getByRole("region", { name: "Conexão" });
    await expect(
      connection.getByRole("heading", { name: "Conectar WhatsApp · Z-API" }),
    ).toBeVisible();
    await expect(
      connection.getByRole("button", { name: "Gerar QR Code" }),
    ).toBeVisible();
    await connection.getByRole("tab", { name: "Código do telefone" }).click();
    await expect(
      connection.getByLabel("Telefone para pareamento"),
    ).toBeVisible();

    const horizontalOverflow = await page.evaluate(
      () =>
        document.documentElement.scrollWidth -
        document.documentElement.clientWidth,
    );
    expect(horizontalOverflow).toBeLessThanOrEqual(0);

    // The fixed mobile bottom nav must never cover the last action: once
    // scrolled into view, "Verificar agora" sits fully above the nav.
    const verifyNow = connection.getByRole("button", {
      name: "Verificar agora",
    });
    await verifyNow.scrollIntoViewIfNeeded();
    const verifyNowBox = await verifyNow.boundingBox();
    const mobileNavBox = await page
      .locator(".crm-whatsapp-mobile-nav")
      .boundingBox();
    expect(verifyNowBox).not.toBeNull();
    expect(mobileNavBox).not.toBeNull();
    expect(verifyNowBox!.y + verifyNowBox!.height).toBeLessThanOrEqual(
      mobileNavBox!.y,
    );
    await saveQaScreenshot(
      page,
      testInfo,
      "crm-whatsapp-connection-pairing-mobile",
    );
  });
});
